import { useParams } from "react-router"
import useWebRTC, { LOCAL_VIDEO } from '../../Hooks/useWebRTC'

export default function Room() {
    const { id: roomsId } = useParams();
    const { clients, provideMediaRef } = useWebRTC(roomsId)

    console.log(clients);

    return (
        <div>
            {clients.map(clientID => (
                <div key={clientID}>
                    <video
                        width='100%'
                        height='100%'
                        ref={instance => {
                            provideMediaRef(clientID, instance)
                        }}
                        autoPlay
                        playsInline
                        muted={clientID === LOCAL_VIDEO}
                    />
                </div>
            ))}
        </div>
    )
}