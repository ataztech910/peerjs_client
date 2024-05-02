'use client';
import { Auth } from '@supabase/auth-ui-react'
import { useSupabaseClient } from '../utils/supabase/client';
import {
    ThemeSupa,
  } from '@supabase/auth-ui-shared'

export default function AuthForm() {
    const supabase = useSupabaseClient();

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user.id) {
        console.log('changed', session);
        window.location.href = '/';
      }
    });
    return <div className="max-w-[50%] m-auto">
              <Auth 
                supabaseClient={supabase} 
                appearance={{theme: ThemeSupa}} 
                theme="dark"
                providers={[]}
                redirectTo={'/'}
            /></div>
}