import { useEffect, useRef } from "react";
import { LiveAvatar } from "@heygen/liveavatar-web-sdk";

export default function LiveAvatarComponent() {
  const avatarRef = useRef(null);

  useEffect(() => {
    const avatar = new LiveAvatar({
      apiKey: "YOUR_NEW_API_KEY"
    });

    avatar.start({
      avatarId: "Anna_public_3_20240108",
      quality: "medium",
      container: document.getElementById("avatar-container")
    });

    avatarRef.current = avatar;
  }, []);

  const speak = () => {
    avatarRef.current?.speak({
      text: "Hello! I am your live AI avatar."
    });
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div
        id="avatar-container"
        style={{ width: "600px", height: "400px", margin: "auto" }}
      ></div>

      <button onClick={speak} style={{ marginTop: "20px" }}>
        Talk
      </button>
    </div>
  );
}