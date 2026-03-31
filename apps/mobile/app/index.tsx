import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });
  }, []);

  if (authed === null) return null;
  return <Redirect href={authed ? "/(tabs)/dashboard" : "/(auth)/login"} />;
}
