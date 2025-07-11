import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

export default function DeleteAccount() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const fn = httpsCallable(functions, 'deleteUserRequest');
      await fn({ email });
    },
    onSuccess: () => {
      toast({ title: 'Request sent', description: 'Check your email for confirmation link.' });
      setEmail('');
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-4">
          <h1 className="text-2xl font-bold">Request account deletion</h1>
          <p className="text-sm text-gray-600">Deleting your account is permanent and cannot be undone.</p>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isLoading || !email}>
            {mutation.isLoading ? 'Sending...' : 'Request deletion'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
