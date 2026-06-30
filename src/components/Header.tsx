import header from "../assets/huerth-open-header.png";
import AudioPlayer from "./AudioPlayer";

function Header() {
  return (
    <header className="hero">
      <img src={header} alt="Hürth Open" className="heroHeader" />

      <p>
        sponsored by <strong>DMF Consulting GmbH</strong>
      </p>

      <AudioPlayer />

      <span>LIVE</span>
    </header>
  );
}

export default Header;