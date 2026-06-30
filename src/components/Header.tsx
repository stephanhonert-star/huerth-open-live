import header from "../assets/huerth-open-header.png";

function Header() {
  return (
    <header className="hero">
      <img src={header} alt="Hürth Open" className="heroHeader" />
      <p>
        sponsored by <strong>DMF Consulting GmbH</strong>
      </p>
      <span>LIVE</span>
    </header>
  );
}

export default Header;