export function AudioPlayer({ src }: { src: string }) {
  return (
    <audio controls preload="none" className="h-10 w-full" src={src}>
      Your browser does not support the audio element.
    </audio>
  );
}
