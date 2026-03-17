import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  createdAt: string;
}

async function fetchProfile() {
  const { data } = await apiClient.get<Profile>("/profile");
  return data;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { setAuth, user, token } = useAuthStore();
  const { data } = useQuery({
    queryKey: ["ceo-profile"],
    queryFn: fetchProfile
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (data) {
      setName(data.name);
      setEmail(data.email);
      setAvatarUrl(data.avatarUrl ?? "");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patch<Profile>("/profile", {
        name,
        email,
        avatarUrl: avatarUrl || undefined,
        password: password || undefined
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["ceo-profile"] });
      if (user && token) {
        setAuth(
          {
            ...user,
            name: response.data.name,
            email: response.data.email
          },
          token
        );
      }
      setPassword("");
    }
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Manage your executive profile, contact details, and credentials.
        </p>
      </div>

      <div className="ceo-card">
        <div className="ceo-card-header">
          <div className="ceo-card-title">Profile details</div>
        </div>
        <div className="px-4 py-4 space-y-4 text-sm">
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">Email</div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">
              Profile image URL
            </div>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 mb-1">
              Change password
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

