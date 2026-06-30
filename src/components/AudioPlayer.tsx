import { useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import song from "../assets/huerth-open-song.mp3";

function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    setPlaying(!playing);
  }

  return (
    <div className="audioPlayer">
      <audio ref={audioRef} src={song} />

      <div className="audioInfo">
        <small>Offizieller Turniersong</small>
        <strong>Hürth Open Anthem</strong>
      </div>

      <button onClick={toggle} className="playButton">
        {playing ? <Pause size={22} /> : <Play size={22} />}
      </button>

      <Volume2 size={20} className="volumeIcon" />
    </div>
  );
}

export default AudioPlayer;