import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

const getFunctionsConfig = () => {
  if (process.env.K_CONFIGURATION) {
    return {};
  }
  try {
    return functions.config();
  } catch {
    return {};
  }
};

let cachedTransporter: nodemailer.Transporter | null = null;
const getTransporter = () => {
  if (!cachedTransporter) {
    const config = getFunctionsConfig();
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email?.user,
        pass: config.email?.pass,
      },
    });
  }
  return cachedTransporter;
};

export const deleteUserRequest = functions.https.onCall(async (data: any, context: any) => {
  const config = getFunctionsConfig();
  const appBaseUrl = config.app?.base_url || 'https://example.com';
  const transporter = getTransporter();
  const email = data?.email;
  if (typeof email !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }
  const record = await db.collection('deletionRequests').add({
    email,
    status: 'pending',
    created: admin.firestore.FieldValue.serverTimestamp(),
  });
  const link = `${appBaseUrl}/delete-account/confirm?requestId=${record.id}`;
  await transporter.sendMail({
    from: config.email?.user,
    to: email,
    subject: 'Confirm account deletion',
    text: `Click the link to confirm deletion: ${link}`,
  });
  return { success: true };
});

export const confirmDeletion = functions.https.onRequest(async (req: any, res: any) => {
  const requestId = req.query.requestId as string | undefined;
  if (!requestId) {
    res.status(400).send('Missing requestId');
    return;
  }
  const recordRef = db.collection('deletionRequests').doc(requestId);
  const snap = await recordRef.get();
  if (!snap.exists) {
    res.status(404).send('Request not found');
    return;
  }
  const { email } = snap.data() as { email: string };
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    await admin.firestore().recursiveDelete(admin.firestore().collection('users').doc(user.uid));
    await admin.storage().bucket().deleteFiles({ prefix: `users/${user.uid}/` });
    await recordRef.update({ status: 'done', confirmed: admin.firestore.FieldValue.serverTimestamp() });
    res.status(200).send('Account deleted');
  } catch (err: any) {
    console.error(err);
    res.status(500).send('Error deleting account');
  }
});

export const boardingChatRedirect = functions.https.onRequest(async (req: any, res: any) => {
  res.set('Cache-Control', 'no-store');

  const path = req.path || '';
  const prefix = '/w/boarding';

  const safeDecode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  let chatToken = '';
  if (path === prefix || path === `${prefix}/`) {
    chatToken = '';
  } else if (path.startsWith(`${prefix}/`)) {
    const rawSegment = path.slice(`${prefix}/`.length).split('/').filter(Boolean)[0] || '';
    const decodedSegment = safeDecode(rawSegment);
    chatToken = decodedSegment.replace(/^\{\{\d+\}\}/, '');
  }

  if (!chatToken) {
    res.status(404).send('Not found');
    return;
  }

  try {
    const snap = await db.doc(`waChatTokens/${chatToken}`).get();
    if (!snap.exists) {
      res.status(404).send('Not found');
      return;
    }

    const data = snap.data() as {
      bookingId?: unknown;
      ownerPhoneE164?: unknown;
      ownerName?: unknown;
      expiresAt?: admin.firestore.Timestamp | unknown;
    };

    const expiresAt = data?.expiresAt as admin.firestore.Timestamp | undefined;
    const expiresAtMillis = expiresAt?.toMillis?.();
    if (typeof expiresAtMillis !== 'number' || expiresAtMillis < Date.now()) {
      res.status(410).send('Gone');
      return;
    }

    const ownerPhoneE164 = typeof data?.ownerPhoneE164 === 'string' ? data.ownerPhoneE164 : '';
    const digits = ownerPhoneE164.replace(/\D/g, '');
    if (!digits) {
      res.status(500).send('Invalid token');
      return;
    }

    const ownerName = typeof data?.ownerName === 'string' ? data.ownerName : '';
    const bookingId = typeof data?.bookingId === 'string' ? data.bookingId : String(data?.bookingId ?? '');

    const message = `Hi ${ownerName}, this is regarding booking ${bookingId} via TwoPaws.`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

    res.set('Location', url).status(302).send('');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
});

export const touchCartUpdatedAt = onDocumentWritten(
  {
    document: 'carts/{cartId}/cartItems/{itemId}'
  },
  async (event) => {
    if (!event.data) return;

    const { cartId } = event.params;
    const cartRef = db.collection('carts').doc(cartId);
    await cartRef.set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
);

const getEnv = (key: string) => process.env[key];

const requireEnv = (key: string) => {
  const value = getEnv(key);
  if (!value) {
    throw new functions.https.HttpsError('failed-precondition', `${key} is not set`);
  }
  return value;
};

const toPositiveInt = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.floor(numeric);
};

const getTimestampMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
};

const getOrderLastUpdatedMillis = (order: Record<string, any>) => {
  return (
    getTimestampMillis(order?.updated_at) ||
    getTimestampMillis(order?.updatedAt) ||
    getTimestampMillis(order?.created_at) ||
    getTimestampMillis(order?.createdAt) ||
    0
  );
};

const getNestedValue = (obj: Record<string, any>, path: string) => {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getBackendUnitPrice = (productData: Record<string, any>) => {
  const salePrice = toFiniteNumber(productData?.sale_price);
  const price = toFiniteNumber(productData?.price);
  if (Boolean(productData?.on_sale) && salePrice > 0) return salePrice;
  return price;
};

const toDocRef = (value: any): admin.firestore.DocumentReference | null => {
  if (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.path === 'string' &&
    typeof value.get === 'function'
  ) {
    return value as admin.firestore.DocumentReference;
  }
  if (typeof value === 'string' && value.trim()) {
    return db.collection('products').doc(value.trim());
  }
  return null;
};

const toUserRef = (value: any): admin.firestore.DocumentReference | null => {
  if (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.path === 'string' &&
    typeof value.get === 'function'
  ) {
    return value as admin.firestore.DocumentReference;
  }
  if (typeof value === 'string' && value.trim()) {
    const raw = value.trim();
    if (raw.includes('/')) return db.doc(raw);
    return db.collection('users').doc(raw);
  }
  return null;
};

const restoreOrderItemsToBuyerCart = async (
  orderRef: admin.firestore.DocumentReference,
  buyerRef: admin.firestore.DocumentReference
) => {
  let cartRef: admin.firestore.DocumentReference | null = null;
  let cartSnap: admin.firestore.DocumentSnapshot | null = null;

  const existingCartQuery = await db.collection('carts').where('userId', '==', buyerRef).limit(1).get();

  if (!existingCartQuery.empty) {
    cartRef = existingCartQuery.docs[0].ref;
    cartSnap = existingCartQuery.docs[0];
  } else {
    cartRef = db.collection('carts').doc();
    await cartRef.set(
      {
        userId: buyerRef,
        total: 0,
        itemCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    cartSnap = await cartRef.get();
  }

  if (!cartRef || !cartSnap?.exists) {
    return { restoredProducts: 0, restoredItemCount: 0, restoredTotal: 0 };
  }

  const orderItemsSnap = await orderRef.collection('orderItems').get();
  if (orderItemsSnap.empty) {
    return { restoredProducts: 0, restoredItemCount: 0, restoredTotal: 0 };
  }

  const cartItemsSnap = await cartRef.collection('cartItems').get();
  const existingCartItems = new Map<string, Record<string, any>>();
  cartItemsSnap.docs.forEach((docSnap) => {
    existingCartItems.set(docSnap.id, docSnap.data() as Record<string, any>);
  });

  const batch = db.batch();
  const mergedByProductId = new Map<
    string,
    { productRef: admin.firestore.DocumentReference; quantity: number; unitPrice: number }
  >();

  // Start from current cart so we only add missing/older order items.
  existingCartItems.forEach((item) => {
    const productRef = toDocRef(item?.productId);
    if (!productRef) return;
    mergedByProductId.set(productRef.id, {
      productRef,
      quantity: Math.max(0, Math.floor(toFiniteNumber(item?.quantity))),
      unitPrice: toFiniteNumber(item?.unitPrice),
    });
  });

  for (const orderItemDoc of orderItemsSnap.docs) {
    const orderItem = orderItemDoc.data() as Record<string, any>;
    const productRef = toDocRef(orderItem?.productRef || orderItem?.productId);
    if (!productRef) continue;

    const orderQty = Math.max(0, Math.floor(toFiniteNumber(orderItem?.quantity)));
    if (orderQty <= 0) continue;

    const productSnap = await productRef.get();
    const productData = (productSnap.exists ? productSnap.data() : {}) as Record<string, any>;
    const computedUnitPrice = getBackendUnitPrice(productData);

    const existing = mergedByProductId.get(productRef.id);
    const existingQty = existing?.quantity ?? 0;
    const existingUnitPrice = existing?.unitPrice ?? 0;
    const unitPrice = computedUnitPrice > 0 ? computedUnitPrice : existingUnitPrice;

    mergedByProductId.set(productRef.id, {
      productRef,
      // Idempotent on retries/duplicate events.
      quantity: Math.max(existingQty, orderQty),
      unitPrice,
    });
  }

  let total = 0;
  let itemCount = 0;
  mergedByProductId.forEach((item) => {
    const quantity = Math.max(0, Math.floor(item.quantity));
    const unitPrice = toFiniteNumber(item.unitPrice);
    if (quantity <= 0) return;

    itemCount += quantity;
    total += quantity * unitPrice;

    batch.set(
      cartRef!.collection('cartItems').doc(item.productRef.id),
      {
        productId: item.productRef,
        quantity,
        unitPrice,
        lastPriceSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  batch.set(
    cartRef,
    {
      itemCount,
      total: Math.max(total, 0),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();

  return {
    restoredProducts: mergedByProductId.size,
    restoredItemCount: itemCount,
    restoredTotal: Math.max(total, 0),
  };
};

const cleanupUnfinishedOrdersInternal = async (olderThanMinutes: number, maxDeletes: number) => {
  const cutoffMillis = Date.now() - olderThanMinutes * 60 * 1000;
  let deleted = 0;
  let scanned = 0;
  let restored = 0;
  let restoreSkipped = 0;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

  while (deleted < maxDeletes) {
    let query = db.collection('orders').where('success', '==', false).limit(200);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    for (const docSnap of snapshot.docs) {
      scanned += 1;
      const data = docSnap.data() as Record<string, any>;
      if (data?.success === true) continue;

      const orderStatus = String(data?.status ?? data?.orderStatus ?? '').toUpperCase();
      if (orderStatus === 'PAID') continue;

      const lastUpdatedMillis = getOrderLastUpdatedMillis(data);
      if (!lastUpdatedMillis || lastUpdatedMillis > cutoffMillis) continue;

      const buyerRef = toUserRef(data?.buyerId);
      try {
        if (buyerRef) {
          await restoreOrderItemsToBuyerCart(docSnap.ref, buyerRef);
          restored += 1;
        } else {
          restoreSkipped += 1;
          console.warn('cleanupUnfinishedOrders skipped restore due to missing buyerId ref', {
            orderId: docSnap.id,
          });
        }
      } catch (restoreErr) {
        console.error('cleanupUnfinishedOrders restore failed; skipping delete to avoid data loss', {
          orderId: docSnap.id,
          error: restoreErr,
        });
        continue;
      }

      await admin.firestore().recursiveDelete(docSnap.ref);
      deleted += 1;
      if (deleted >= maxDeletes) break;
    }

    if (snapshot.size < 200) break;
  }

  return {
    deleted,
    scanned,
    restored,
    restoreSkipped,
    cutoffIso: new Date(cutoffMillis).toISOString(),
  };
};

const getPaymobErrorMessage = (payload: any) => {
  if (!payload) return 'Unable to create Paymob intention';
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail;
  if (Array.isArray(payload?.detail)) {
    const parts = payload.detail
      .map((item: any) => item?.msg || item?.message || JSON.stringify(item))
      .filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  return 'Unable to create Paymob intention';
};

const buildPaymobHmac = (payload: Record<string, any>, secret: string) => {
  const fields = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order.id',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success',
  ];

  const concatenated = fields
    .map((field) => {
      const value = getNestedValue(payload, field);
      if (value === null || value === undefined) return '';
      return String(value);
    })
    .join('');

  return crypto.createHmac('sha512', secret).update(concatenated).digest('hex');
};

export const createPaymobPayment = functions.https.onCall(async (data: any, context: any) => {
  const auth = context?.auth;
  if (!auth?.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in. Call this endpoint as a Firebase callable function with a valid Firebase ID token.'
    );
  }
  const orderId = typeof data?.orderId === 'string' ? data.orderId : '';
  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId is required');
  }

  const secretKey = requireEnv('PAYMOB_SECRET_KEY');
  const publicKey = requireEnv('PAYMOB_PUBLIC_KEY');
  const intentionUrl = requireEnv('PAYMOB_INTENTION_API_URL');
  const integrationId = Number(requireEnv('PAYMOB_INTEGRATION_ID'));
  const notificationUrl = getEnv('PAYMOB_NOTIFICATION_URL');
  const redirectionUrl = getEnv('PAYMOB_REDIRECTION_URL');

  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Order not found');
  }
  const orderData = orderSnap.data() as {
    totalPrice?: number;
    shippingAddress?: admin.firestore.DocumentReference;
    buyerId?: admin.firestore.DocumentReference;
    orderNumber?: number;
  };

  if (orderData?.buyerId?.id && orderData.buyerId.id !== auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Order does not belong to user');
  }

  const amountCents = Math.round((orderData.totalPrice ?? 0) * 100);
  if (!amountCents || amountCents <= 0) {
    throw new functions.https.HttpsError('failed-precondition', 'Order total is invalid');
  }

  if (!notificationUrl) {
    throw new functions.https.HttpsError('failed-precondition', 'PAYMOB_NOTIFICATION_URL is not set');
  }

  const addressSnap = orderData.shippingAddress ? await orderData.shippingAddress.get() : null;
  const addressData = (addressSnap?.exists ? addressSnap.data() : {}) as Record<string, any>;
  const buyerUid = orderData?.buyerId?.id || auth.uid;
  let recipientName = String(addressData?.recipientName || addressData?.name || '').trim();
  if (!recipientName && buyerUid) {
    const userSnap = await db.collection('users').doc(buyerUid).get();
    if (userSnap.exists) {
      const userData = (userSnap.data() || {}) as Record<string, any>;
      recipientName = String(
          userData?.display_name ||
          userData?.displayName ||
          userData?.name ||
          auth.token?.name ||
          ''
      ).trim();
    }
  }
  if (!recipientName) {
    recipientName = String(auth.token?.name || 'Customer').trim() || 'Customer';
  }
  const nameParts = recipientName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || 'TwoPaws';

  const payload: Record<string, any> = {
    amount: amountCents,
    currency: 'EGP',
    payment_methods: [integrationId],
    items: [
      {
        name: `Order ${orderData.orderNumber ?? orderId}`,
        amount: amountCents,
        quantity: 1,
        description: 'TwoPaws order',
      },
    ],
    billing_data: {
      first_name: firstName || 'Customer',
      last_name: lastName || 'TwoPaws',
      email: auth.token?.email || 'support@twopaws.pet',
      phone_number: addressData?.phone || 'NA',
      apartment: addressData?.apartment || 'NA',
      floor: addressData?.floor || 'NA',
      street: addressData?.street || 'NA',
      building: addressData?.building || 'NA',
      shipping_method: 'PKG',
      postal_code: addressData?.postalCode || '00000',
      city: addressData?.city || 'Cairo',
      country: addressData?.country || 'EG',
      state: addressData?.area || 'NA',
    },
    special_reference: orderId,
    notification_url: notificationUrl,
  };

  if (redirectionUrl) {
    payload.redirection_url = redirectionUrl;
  }

  const intentionResponse = await fetch(intentionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${secretKey}`,
    },
    body: JSON.stringify(payload),
  });
  const intentionJson = await intentionResponse.json().catch(() => null);
  if (!intentionResponse.ok) {
    const errorMessage = getPaymobErrorMessage(intentionJson);
    console.error('Paymob intention failed', {
      orderId,
      status: intentionResponse.status,
      response: intentionJson,
    });
    throw new functions.https.HttpsError('internal', errorMessage);
  }
  if (!intentionJson?.client_secret) {
    throw new functions.https.HttpsError('internal', 'Paymob did not return a client secret');
  }

  await orderRef.set(
    {
      paymentProvider: 'paymob',
      paymentMethod: 'card',
      paymentStatus: 'PAYMENT_PENDING',
      paymobOrderId: intentionJson?.intention_order_id ?? null,
      paymobIntentionId: intentionJson?.id ?? null,
      status: 'PAYMENT_PENDING',
      orderStatus: 'PAYMENT_PENDING',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    clientSecret: intentionJson.client_secret,
    publicKey,
    intentionId: intentionJson?.id ?? null,
  };
});

export const paymobWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const secret = requireEnv('PAYMOB_HMAC_SECRET');
    const payload = (req.body ?? {}) as { hmac?: string; obj?: Record<string, any>; data?: Record<string, any> };
    const hmac = payload?.hmac || (req.query?.hmac as string | undefined);
    const obj = payload?.obj || payload?.data || (payload as Record<string, any>);

    if (!hmac || !obj) {
      res.status(400).send('Missing payload');
      return;
    }

    const computed = buildPaymobHmac(obj, secret);
    if (computed !== hmac) {
      res.status(403).send('Invalid HMAC');
      return;
    }

    const paymobOrderId = obj?.order?.id;
    const paymobIntentionId = obj?.intention?.id || obj?.intention_id || obj?.payment_intention?.id;
    const merchantOrderId =
      obj?.order?.merchant_order_id || obj?.merchant_order_id || obj?.special_reference;
    const success = Boolean(obj?.success ?? obj?.is_success ?? obj?.transaction?.success);

    let orderRef: admin.firestore.DocumentReference | null = null;
    if (merchantOrderId) {
      orderRef = db.collection('orders').doc(String(merchantOrderId));
    } else if (paymobIntentionId) {
      const snapshot = await db
        .collection('orders')
        .where('paymobIntentionId', '==', paymobIntentionId)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        orderRef = snapshot.docs[0].ref;
      }
    } else if (paymobOrderId) {
      const snapshot = await db
        .collection('orders')
        .where('paymobOrderId', '==', paymobOrderId)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        orderRef = snapshot.docs[0].ref;
      }
    }

    if (!orderRef) {
      res.status(404).send('Order not found');
      return;
    }

    const orderSnap = await orderRef.get();
    const orderData = orderSnap.data() as {
      buyerId?: admin.firestore.DocumentReference;
    };

    const nextPaymentStatus = success ? 'PAID' : 'PAYMENT_FAILED';
    const nextOrderStatus = success ? 'Pending' : 'PAYMENT_FAILED';
    await orderRef.set(
      {
        paymentProvider: 'paymob',
        paymentMethod: 'card',
        paymentStatus: nextPaymentStatus,
        paymobTransactionId: obj?.id ?? obj?.transaction?.id ?? null,
        paymobClientSecret: admin.firestore.FieldValue.delete(),
        success,
        status: nextOrderStatus,
        orderStatus: nextOrderStatus,
        paidAt: success ? admin.firestore.FieldValue.serverTimestamp() : null,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (success && orderData?.buyerId?.id) {
      let cartRef = db.collection('carts').doc(orderData.buyerId.id);
      let cartSnap = await cartRef.get();
      if (!cartSnap.exists) {
        const cartQuery = await db
          .collection('carts')
          .where('userId', '==', orderData.buyerId)
          .limit(1)
          .get();
        if (!cartQuery.empty) {
          cartRef = cartQuery.docs[0].ref;
          cartSnap = cartQuery.docs[0];
        }
      }

      if (cartSnap.exists) {
        const cartItemsSnap = await cartRef.collection('cartItems').get();
        const batch = db.batch();
        cartItemsSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        batch.set(
          cartRef,
          {
            total: 0,
            itemCount: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        await batch.commit();
      }
    }

    if (!success && orderData?.buyerId) {
      await restoreOrderItemsToBuyerCart(orderRef, orderData.buyerId);
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
});

const cleanupSchedule = getEnv('ORDER_CLEANUP_SCHEDULE') || 'every 5 minutes';
const cleanupTimeZone = getEnv('ORDER_CLEANUP_TIMEZONE') || 'Africa/Cairo';

export const cleanupUnfinishedOrders = onSchedule(
  { schedule: cleanupSchedule, timeZone: cleanupTimeZone, retryCount: 1 },
  async () => {
    const olderThanMinutes = toPositiveInt(getEnv('ORDER_CLEANUP_AGE_MINUTES'), 10);
    const maxDeletes = toPositiveInt(getEnv('ORDER_CLEANUP_MAX_DELETES'), 100);
    const result = await cleanupUnfinishedOrdersInternal(olderThanMinutes, maxDeletes);
    console.log('cleanupUnfinishedOrders completed', {
      olderThanMinutes,
      maxDeletes,
      ...result,
    });
  }
);
