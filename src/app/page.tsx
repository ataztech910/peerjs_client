'use client';
import { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import { useSupabaseClient } from "./utils/supabase/client";
import { DATA_TABLE_NAMES } from "./utils/constants";
import Peer from "peerjs";

const MakeUserData = ({ user }: { user: UserType }) => {
  return (<>{user.id && <div>{JSON.stringify(user)}</div>}</>);
}

export default function Home() {
  const supabase = useSupabaseClient();
  const [user, setUser] = useState<UserType>({} as UserType);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const users = await supabase.from(DATA_TABLE_NAMES.CONNECTION).select('email, userConnection, status');
      console.log(users);
    })();
  }, []);

  useEffect(() => {
    let peer: Peer;
    (async () => {
      const session: any = await supabase.auth.getUser();
      console.log('session', session);
      if (session.error !== null) {
        setError(true);
      } else {
        peer = new Peer({
          host: 'localhost',
          port: 9000,
          path: '/myapp',
        });
        peer.on('open', function(id) {
          console.log('My peer ID is: ' + id);
          const userData: UserType = {
            ...session.data?.user,
            connectionId: id
          }
          setUser(userData);
        });
      }
    })();
  }, [supabase.auth]);
  
  useEffect(() => {
    (async () => {
      console.log(user);
        const connection = await supabase.from(DATA_TABLE_NAMES.CONNECTION).select().eq('userID', user.id);
            if (!user.connectionId) return false;
            if(connection?.data?.length === 0) {
              const { error } = await supabase
                                  .from(DATA_TABLE_NAMES.CONNECTION)
                                    .insert({ userConnection: user.connectionId, userID: user.id, email: user.email, status: true });
              console.log('error', error);
            } else {
              const { error } = await supabase
                                  .from(DATA_TABLE_NAMES.CONNECTION)
                                    .update({ userConnection: user.connectionId })
                                    .eq('userID', user.id);
              console.log('{ userConnection: connectionId }', { userConnection: user.connectionId, userID: user.id });
              console.log('error', error);
            }
      })();
  }, [user])

  return (
    <main>
      {error &&
        <AuthForm />
      }
      {!error && <MakeUserData user={user} />}
    </main>
  );
}
