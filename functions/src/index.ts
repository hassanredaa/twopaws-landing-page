import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import nodemailer from 'nodemailer';

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
