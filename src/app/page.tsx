'use client';
import { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import { useSupabaseClient } from "./utils/supabase/client";
import { DATA_TABLE_NAMES } from "./utils/constants";
import Peer from "peerjs";

let peer: Peer;

const MakeUserData = ({ user }: { user: UserType }) => {
  const supabase = useSupabaseClient();
  const signOut = () => {
    (async () => {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        const { error: updateError } = await supabase
                                  .from(DATA_TABLE_NAMES.CONNECTION)
                                    .update({ userConnection: '', status: false })
                                    .eq('userID', user.id);
        window.location.href = '/';
      }
      else {
        console.log('Signout error', error);
      }
    })();
  }
  return (<>{user.id && <div>Welcome , {user.email} ! <button className="button" onClick={signOut}>Sign Out</button></div>}</>);
};

const VideoCall = ({connectorID} : any) => {
  console.log('connectorID', connectorID);
  useEffect(()=> {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        const localVideo: any = document.getElementById('localVideo');
        if(!localVideo) return false;
        localVideo.srcObject = stream;
        if (connectorID === null) return false;
        const call = peer.call(connectorID, stream);
        call.on('stream', function(remoteStream) {
          const remoteVideo: any = document.getElementById('remoteVideo');
          remoteVideo.srcObject = remoteStream;
        });
    });
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      if (!peer) return false;
      peer.on('call', call => {
        call.answer(stream);
        call.on('stream', remoteStream => {
          const remoteVideo: any = document.getElementById('remoteVideo');
          if(!remoteVideo) return false;
          remoteVideo.srcObject = remoteStream;
        });
      });
    });
  }, [connectorID]);
  


  return (
    <div className="mt-4 relative">
        <div className="bg-slate-100 p-2 max-w-[fit-content]">
          <h2>My Face</h2>
          <video id="localVideo" autoPlay></video>
        </div>
        <div className="bg-slate-200 p-2 absolute right-10 bottom-0 max-w-[300px]">
          <h2>Not my Face</h2>  
          <video id="remoteVideo" autoPlay></video>
        </div>
    </div>
  )
}

const MakeUserList = ({ user }: any) => {
  const [usersList, setUsersList] = useState([]);
  const [connectionId, setConnectionId] = useState(null);
  const supabase = useSupabaseClient();
  useEffect(() => {
    (async () => {
      const users: any = await supabase.from(DATA_TABLE_NAMES.CONNECTION).select('email, userConnection, status');
      console.log('users', users);
      setUsersList(users.data);
    })();
  }, [supabase]);

  useEffect(() => {
    const handleUpdate = (payload: any) => {
      console.log('Change received! users', payload);
      console.log('Change received! users', usersList);
      if (!payload) return false;
      const updatedUser = usersList.findIndex((item: any) => item.email === payload.new.email);
      if (updatedUser < 0) return false;
  
      console.log('users index', updatedUser);
      const state: any = JSON.parse(JSON.stringify(usersList));
      state[updatedUser] = {
        email: payload.new.email,
        status: payload.new.status,
        userConnection: payload.new.userConnection
      };
      
      setUsersList(state);
      console.log('Change received! users', state);
    };

    const channel = supabase
      .channel(DATA_TABLE_NAMES.CONNECTION)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: DATA_TABLE_NAMES.CONNECTION }, handleUpdate)
        .subscribe();
    return () => {
      supabase.removeChannel(channel);
    }
  }, [supabase, usersList]);

  if (!usersList) return '';
  const userListFiltered = usersList.filter((item: any) => item.email !== user.email)
  return (
    <>
    <h1>Users in system</h1>
    <ul>
      {userListFiltered.map((item: any) => 
        <li key={item.userConnection}>
          <div className="flex items-center">
            <div>{item.email} {item.status ? 'online' : 'offline'} {item.userConnection}</div>
            {item.status &&
              <div><button className="button" onClick={() => setConnectionId(item.userConnection)}>Connect</button></div>
            }
          </div>
        </li>
      )}
    </ul>
    <VideoCall connectorID={connectionId} />
    </>
  );
};

export default function Home() {
  const supabase = useSupabaseClient();
  const [user, setUser] = useState<UserType>({} as UserType);
  const [error, setError] = useState(false);
  console.log('Component reload');

  useEffect(() => {
    
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
        peer.on('open', function(id: any) {
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
                                    .update({ userConnection: user.connectionId, status: true })
                                    .eq('userID', user.id);
              console.log('{ userConnection: connectionId }', { userConnection: user.connectionId, userID: user.id });
              console.log('error', error);
            }
      })();
  }, [user]);

  return (
    <main className="max-w-[1200px] m-auto h-svh p-4">

      {error &&
        <AuthForm />
      }
      {!error && <MakeUserData user={user} />}
      {!error && <MakeUserList user={user} />}

    </main>
  );
}
