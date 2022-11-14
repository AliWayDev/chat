import freeice from "freeice";
import { useCallback, useEffect, useRef } from "react";
import socket from "../socket";
import ACTIONS from "../socket/actions";
import useStateWithCallback from "./useStateWithCallback";

export const LOCAL_VIDEO = 'LOCAL_VIDEO'

export default function useWebRTC(roomId) {
  const [clients, updateClients] = useStateWithCallback([])

  const addNewClient = useCallback((newClient, cb) => {
    updateClients(list => {
      if (!list.includes(newClient)) {
        return [...list, newClient]
      }

      return list;
    }, cb);
  }, [updateClients])

  let peerConnections = useRef({})
  let localMediaStream = useRef(null)
  let peerMediaElements = useRef({
    [LOCAL_VIDEO]: null
  })

  useEffect(() => {
    async function handleNewPeer({ peerId, createOffer }) {
      if (peerId in peerConnections.current) {
        return console.warn(`Already connected to peer ${peerId}`);
      }

      peerConnections.current[peerId] = new RTCPeerConnection({
        iceServers: freeice(),
      });

      peerConnections.current[peerId].onicecandidate = event => {
        if (event.candidate) {
          socket.emit(ACTIONS.RELAY_ICE, {
            peerId,
            iceCandidate: event.candidate,
          });
        }
      }
      let trackC = 0;
      peerConnections.current[peerId].ontrack = ({ streams: [remoteStream] }) => {
        trackC++

        if (trackC === 2) {
          addNewClient(peerId, () => {
            peerMediaElements.current[peerId].srcObject = remoteStream
          })
        }
      }

      localMediaStream.current.getTracks().forEach(track => {
        peerConnections.current[peerId].addTrack(track, localMediaStream.current)
      })

      if (createOffer) {
        const offer = await peerConnections.current[peerId].createOffer();

        await peerConnections.current[peerId].setLocalDescription(offer)

        socket.emit(ACTIONS.RELAY_SDP, {
          peerId,
          sessionDescription: offer
        })
      }
    }

    socket.on(ACTIONS.ADD_PEER, handleNewPeer)
  }, [addNewClient])

  useEffect(() => {
    async function setRemoteMedia({ peerId, sessionDescription: remoteDescription }) {
      await peerConnections[peerId].setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      )

      if (remoteDescription.type === 'offer') {
        const answer = await peerConnections.current[peerId].createAnswer();

        await peerConnections.current[peerId].setLocalDescription(answer)

        socket.emit(ACTIONS.RELAY_SDP, {
          peerId,
          sessionDescription: answer
        })
      }
    }

    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia)
  }, [])

  useEffect(() => {
    socket.on(ACTIONS.REMOVE_PEER, ({ peerId }) => {
      if (peerConnections.current[peerId]) {
        peerConnections.current[peerId].close()
      }

      delete peerConnections.current[peerId]
      delete peerMediaElements.current[peerId]

      updateClients(list => list.filter(c => c !== peerId))
    })
  }, [updateClients])

  useEffect(() => {
    socket.on(ACTIONS.ICE_CANDIDATE, ({ peerId, iceCandidate }) => {
      peerConnections.current[peerId].addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      )
    })
  }, [])

  useEffect(() => {
    async function startCapture() {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        }
      });

      addNewClient(LOCAL_VIDEO, () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

        if (localVideoElement) {
          localVideoElement.volume = 0;
          localVideoElement.srcObject = localMediaStream.current;
        }
      });
    }

    startCapture()
      .then(() => socket.emit(ACTIONS.JOIN, { room: roomId }))
      .catch(e => console.error('Error getting userMedia:', e));

    return () => {
      localMediaStream.current?.getTracks().forEach(track => track.stop());

      socket.emit(ACTIONS.LEAVE)
    }

  }, [roomId, addNewClient])

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node
  }, [])

  return {
    clients,
    provideMediaRef
  }
}