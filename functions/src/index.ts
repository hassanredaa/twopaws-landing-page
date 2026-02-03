import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
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

const getNestedValue = (obj: Record<string, any>, path: string) => {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
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
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }
  const orderId = typeof data?.orderId === 'string' ? data.orderId : '';
  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId is required');
  }

  const apiKey = requireEnv('PAYMOB_API_KEY');
  const integrationId = Number(requireEnv('PAYMOB_INTEGRATION_ID'));
  const iframeId = Number(requireEnv('PAYMOB_IFRAME_ID'));

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

  if (orderData?.buyerId?.id && orderData.buyerId.id !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Order does not belong to user');
  }

  const amountCents = Math.round((orderData.totalPrice ?? 0) * 100);
  if (!amountCents || amountCents <= 0) {
    throw new functions.https.HttpsError('failed-precondition', 'Order total is invalid');
  }

  const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const authJson = await authResponse.json();
  if (!authJson?.token) {
    throw new functions.https.HttpsError('internal', 'Unable to authenticate with Paymob');
  }

  const paymobOrderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authJson.token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: 'EGP',
      items: [
        {
          name: `Order ${orderData.orderNumber ?? orderId}`,
          amount_cents: amountCents,
          quantity: 1,
          description: 'TwoPaws order',
        },
      ],
      merchant_order_id: orderId,
    }),
  });
  const paymobOrderJson = await paymobOrderResponse.json();
  if (!paymobOrderJson?.id) {
    throw new functions.https.HttpsError('internal', 'Unable to create Paymob order');
  }

  const addressSnap = orderData.shippingAddress ? await orderData.shippingAddress.get() : null;
  const addressData = (addressSnap?.exists ? addressSnap.data() : {}) as Record<string, any>;
  const recipientName = addressData?.recipientName || addressData?.name || '';
  const [firstName = 'Customer', lastName = ''] = String(recipientName).split(' ');

  const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authJson.token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: paymobOrderJson.id,
      currency: 'EGP',
      integration_id: integrationId,
      billing_data: {
        first_name: firstName || 'Customer',
        last_name: lastName || 'TwoPaws',
        email: context.auth.token?.email || 'support@twopaws.pet',
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
      lock_order_when_paid: true,
    }),
  });
  const paymentKeyJson = await paymentKeyResponse.json();
  if (!paymentKeyJson?.token) {
    throw new functions.https.HttpsError('internal', 'Unable to initialize payment');
  }

  const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKeyJson.token}`;

  await orderRef.set(
    {
      paymentProvider: 'paymob',
      paymentStatus: 'PAYMENT_PENDING',
      paymobOrderId: paymobOrderJson.id,
      status: 'PAYMENT_PENDING',
      orderStatus: 'PAYMENT_PENDING',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { iframeUrl };
});

export const paymobWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const secret = requireEnv('PAYMOB_HMAC_SECRET');
    const payload = req.body as { hmac?: string; obj?: Record<string, any> };
    const hmac = payload?.hmac || (req.query?.hmac as string | undefined);
    const obj = payload?.obj;

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
    const merchantOrderId = obj?.order?.merchant_order_id;
    const success = Boolean(obj?.success);

    let orderRef: admin.firestore.DocumentReference | null = null;
    if (merchantOrderId) {
      orderRef = db.collection('orders').doc(String(merchantOrderId));
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

    const nextStatus = success ? 'PAID' : 'PAYMENT_FAILED';
    await orderRef.set(
      {
        paymentProvider: 'paymob',
        paymentStatus: nextStatus,
        paymobTransactionId: obj?.id ?? null,
        success,
        status: nextStatus,
        orderStatus: nextStatus,
        paidAt: success ? admin.firestore.FieldValue.serverTimestamp() : null,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (success && orderData?.buyerId?.id) {
      const cartRef = db.collection('carts').doc(orderData.buyerId.id);
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

    res.status(200).send('ok');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error');
  }
});
