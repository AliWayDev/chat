import { Route, Routes } from "react-router";
import Main from "./Components/Main";
import NotFound from "./Components/NotFound";
import Room from "./Components/Room";

function App() {
  return (
    <div>
      <Routes>
        <Route exact path="/" element={<Main />} />
          <Route exact path="/room/:id" element={<Room />} />
          <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
