import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { isReactSnapPrerender } from "@/lib/isPrerender";

type AuthContextValue = {
  user: User | null;
  userDisplayName: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (
    email: string,
    password: string,
    profile?: {
      displayName?: string;
      phone?: string;
    }
  ) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signInWithApple: () => Promise<User>;
  signOutUser: () => Promise<void>;
  userRef: ReturnType<typeof doc> | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getLocalDayStartTimestamp = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(startOfDay);
};

const getDisplayNameFromUserData = (data: Record<string, unknown>) => {
  const fromSnakeCase =
    typeof data.display_name === "string" ? data.display_name.trim() : "";
  if (fromSnakeCase) return fromSnakeCase;
  const fromCamelCase =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (fromCamelCase) return fromCamelCase;
  return null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const prerender = isReactSnapPrerender();
  const [user, setUser] = useState<User | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!prerender);

  useEffect(() => {
    if (prerender) {
      setUser(null);
      setUserDisplayName(null);
      setLoading(false);
      return;
    }

    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setUserDisplayName(null);
      } else {
        const fallbackName = nextUser.displayName?.trim() || null;
        setUserDisplayName(fallbackName);
        void getDoc(doc(db, "users", nextUser.uid))
          .then((snap) => {
            if (!active || !snap.exists()) return;
            const fromDoc = getDisplayNameFromUserData(
              (snap.data() ?? {}) as Record<string, unknown>
            );
            if (fromDoc) {
              setUserDisplayName(fromDoc);
            }
          })
          .catch(() => {
            // Keep fallback auth displayName when profile doc fetch fails.
          });
      }
      setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [prerender]);

  const upsertUserProfile = useCallback(async (
    nextUser: User,
    profile?: {
      displayName?: string;
      phone?: string;
    }
  ) => {
    const userDocRef = doc(db, "users", nextUser.uid);
    const existingDoc = await getDoc(userDocRef);
    const existingData = (existingDoc.data() ?? {}) as Record<string, unknown>;

    const providedDisplayName =
      typeof profile?.displayName === "string" ? profile.displayName.trim() : "";
    const providedPhone =
      typeof profile?.phone === "string" ? profile.phone.trim() : "";

    const existingDisplayName =
      getDisplayNameFromUserData(existingData);
    const existingPhotoUrl =
      (typeof existingData.photo_url === "string" && existingData.photo_url) ||
      (typeof existingData.photoURL === "string" && existingData.photoURL) ||
      null;
    const existingPhone =
      (typeof existingData.phone === "string" && existingData.phone) ||
      (typeof existingData.phone_number === "string" && existingData.phone_number) ||
      "";
    const existingPhoneVerified =
      (typeof existingData.phoneVerified === "boolean" && existingData.phoneVerified) ||
      (typeof existingData.phone_verified === "boolean" && existingData.phone_verified) ||
      false;
    const existingEmail =
      (typeof existingData.email === "string" && existingData.email) || null;

    const displayName =
      providedDisplayName || nextUser.displayName || existingDisplayName || null;
    const photoUrl = nextUser.photoURL ?? existingPhotoUrl;
    const phone = providedPhone || nextUser.phoneNumber || existingPhone;

    const payload: Record<string, unknown> = {
      uid: nextUser.uid,
      email: nextUser.email ?? existingEmail,
      display_name: displayName,
      photo_url: photoUrl,
      photoURL: photoUrl,
      phone,
      phone_number: phone,
      // Keep app-compatible default: false on new user docs.
      phoneVerified: existingDoc.exists() ? existingPhoneVerified : false,
      phone_verified: existingDoc.exists() ? existingPhoneVerified : false,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!existingDoc.exists()) {
      payload.createdAt = serverTimestamp();
      payload.created_time = serverTimestamp();
      payload.dailyTxnDate = getLocalDayStartTimestamp();
      payload.joinBonusGiven = false;
      payload.petIds = [];
    } else {
      if (typeof existingData.created_time === "undefined") {
        payload.created_time = serverTimestamp();
      }
      if (typeof existingData.dailyTxnDate === "undefined") {
        payload.dailyTxnDate = getLocalDayStartTimestamp();
      }
      if (typeof existingData.joinBonusGiven === "undefined") {
        payload.joinBonusGiven = false;
      }
      if (typeof existingData.petIds === "undefined") {
        payload.petIds = [];
      }
      if (typeof existingData.phoneVerified === "undefined") {
        payload.phoneVerified = false;
      }
      if (typeof existingData.phone_verified === "undefined") {
        payload.phone_verified = false;
      }
    }

    await setDoc(userDocRef, payload, { merge: true });
    setUserDisplayName(displayName);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await upsertUserProfile(credential.user);
    return credential.user;
  }, [upsertUserProfile]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      profile?: {
        displayName?: string;
        phone?: string;
      }
    ) => {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (profile?.displayName) {
        await updateProfile(credential.user, { displayName: profile.displayName });
      }
      await upsertUserProfile(credential.user, profile);
      return credential.user;
    },
    [upsertUserProfile]
  );

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);
    await upsertUserProfile(credential.user);
    return credential.user;
  }, [upsertUserProfile]);

  const signInWithApple = useCallback(async () => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    const credential = await signInWithPopup(auth, provider);
    await upsertUserProfile(credential.user);
    return credential.user;
  }, [upsertUserProfile]);

  const signOutUser = useCallback(async () => {
    setUserDisplayName(null);
    await signOut(auth);
  }, []);

  const userRef = useMemo(() => {
    if (!user) return null;
    return doc(db, "users", user.uid);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      userDisplayName,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOutUser,
      userRef,
    }),
    [
      user,
      userDisplayName,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOutUser,
      userRef,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
