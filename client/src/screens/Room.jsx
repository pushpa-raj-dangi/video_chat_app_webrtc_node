import { useSocket } from "./../context/SocketProvider";
import { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
const Room = () => {
  const socket = useSocket();

  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const handleJoinRoom = useCallback(({ email, id }) => {
    console.log(email, id);
    setRemoteSocketId(id);
  }, []);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMyStream(stream);
      console.log("incoming call", from, offer);
      const ans = await peer.answer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const hanleCallAccepted = useCallback(
    async ({ from, ans }) => {
      peer.setLocalDescription(ans);
      sendStreams();

      console.log("call accepted", from, ans);
    },
    [sendStreams]
  );

  useEffect(() => {
    peer.peer.addEventListener("track", (e) => {
      const remoteStream = e.streams;
      setRemoteStream(remoteStream[0]);
    });
  }, [socket]);

  const handleNegotiationNeeded = useCallback(async () => {
    const offer = await peer.getOffer(myStream);
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [socket, remoteSocketId, myStream]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegotiationNeeded);
    return () => {
      peer.peer.removeEventListener(
        "negotiationneeded",
        handleNegotiationNeeded
      );
    };
  }, [socket, handleNegotiationNeeded]);

  const handleNegotiationNeededIncoming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.answer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegotiationNeededFinal = useCallback(
    async ({ ans }) => {
      await peer.setLocalDescription(ans);
      for (const track of myStream.getTracks()) {
        peer.peer.addTrack(track, myStream);
      }
    },
    [myStream]
  );

  useEffect(() => {
    socket.on("user:joined", handleJoinRoom);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", hanleCallAccepted);
    socket.on("peer:nego:needed", handleNegotiationNeededIncoming);
    socket.on("peer:nego:final", handleNegotiationNeededFinal);
    return () => {
      socket.off("user:joined");
      socket.off("incoming:call");
      socket.off("call:accepted");
      socket.off("peer:nego:needed");
      socket.off("peer:nego:final");
    };
  }, [
    socket,
    handleJoinRoom,
    handleIncomingCall,
    hanleCallAccepted,
    handleNegotiationNeededIncoming,
    handleNegotiationNeededFinal,
  ]);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    const offer = await peer.getOffer(stream);
    socket.emit("call:user", { offer, to: remoteSocketId });
    setMyStream(stream);
  }, [socket, remoteSocketId]);

  return (
    <div>
      <h1>remoteSocketId: {remoteSocketId ? "Connected" : "No one in room"}</h1>
      {myStream && (
        <>
          <button onClick={sendStreams}>Send Streams</button>
        </>
      )}
      {myStream && (
        <>
          Local Stream
          <ReactPlayer
            playing
            muted
            height="100px"
            width="200px"
            url={myStream}
          />
        </>
      )}
      {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100px"
            width="200px"
            url={remoteStream}
          />
        </>
      )}
      {remoteSocketId && <button onClick={handleCallUser}>Call</button>}
    </div>
  );
};

export default Room;
