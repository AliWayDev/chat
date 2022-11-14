import { useEffect, useState } from "react"
import { useNavigate } from "react-router";
import socket from "../../socket"
import ACTIONS from "../../socket/actions"
import { v4 as uuidv4 } from 'uuid';

export default function Main() {
	const [rooms, setRooms] = useState([])
	const navigate = useNavigate();

	console.log(rooms);

	useEffect(() => {
		socket.on(ACTIONS.SHARE_ROOMS, ({ rooms = [] } = {}) => {
			setRooms(rooms);
		});
	}, []);

	const createRoom = () => navigate(`/room/${uuidv4()}`)
	const joinRoom = id => navigate(`/room/${id}`)

	return (
		<div>
			<h1>Rooms</h1>
			<ul>
				{rooms.map((room) => (
					<li key={room}>
						{room}
						<button onClick={() => joinRoom(room)}>Join to Room</button>
					</li>
				))}
			</ul>
			<button onClick={() => createRoom()}>Create Room</button>
		</div>
	)
}