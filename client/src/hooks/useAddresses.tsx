import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  GeoPoint,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export const ADDRESS_COUNTRY = "Egypt";
export const ADDRESS_CITIES = ["Cairo", "Giza"] as const;

export type AddressDoc = {
  id: string;
  label?: string;
  recipientName?: string;
  phone?: string;
  country?: string;
  city?: string;
  area?: string;
  street?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  notes?: string;
  location?: GeoPoint;
  [key: string]: unknown;
};

export function useAddresses() {
  const { user, userRef } = useAuth();
  const [addresses, setAddresses] = useState<AddressDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !userRef) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "addresses"), where("userId", "==", userRef));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAddresses(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as AddressDoc[]
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userRef]);

  const addAddress = useCallback(
    async (payload: Omit<AddressDoc, "id">) => {
      if (!user || !userRef) {
        throw new Error("You must be signed in to add an address.");
      }
      await addDoc(collection(db, "addresses"), {
        ...payload,
        userId: userRef,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [user, userRef]
  );

  const updateAddress = useCallback(
    async (id: string, payload: Partial<Omit<AddressDoc, "id">>) => {
      if (!user || !userRef) {
        throw new Error("You must be signed in to update an address.");
      }
      await setDoc(
        doc(db, "addresses", id),
        {
          ...payload,
          userId: userRef,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [user, userRef]
  );

  return { addresses, loading, addAddress, updateAddress };
}

export const formatAddress = (address?: AddressDoc | null) => {
  if (!address) return "";
  const parts = [
    address.label,
    address.recipientName,
    address.phone,
    address.street,
    address.building,
    address.floor,
    address.apartment,
    address.area,
    address.country,
    address.city,
  ].filter(Boolean);
  if (parts.length) return parts.join(" • ");
  const fallback = Object.values(address)
    .filter((value) => typeof value === "string")
    .slice(0, 3)
    .join(" • ");
  return fallback || "Saved address";
};
