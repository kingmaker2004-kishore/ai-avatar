import { useEffect, useRef, useState } from "react";
import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  SessionState
} from "@heygen/liveavatar-web-sdk";

type Props = {
  apiBaseUrl: string;
  playbackRequest: number;
  text: string;
};

type SessionPrivateInternals = {
  _sessionInfo?: {
    session_id?: string;
  };
  room?: {
    startAudio?: () => Promise<void>;
    localParticipant?: {
      publishData: (
        data: Uint8Array,
        options?: { reliable?: boolean; topic?: string }
      ) => Promise<void>;
    };
  };
};

function getSessionInternals(session: LiveAvatarSession | null) {
  return session as unknown as SessionPrivateInternals | null;
}

function getSessionId(session: LiveAvatarSession | null) {
  return getSessionInternals(session)?._sessionInfo?.session_id ?? null;
}

async function resumeAvatarAudio(session: LiveAvatarSession | null, video: HTMLVideoElement | null) {
  const internals = getSessionInternals(session);

  try {
    await internals?.room?.startAudio?.();
  } catch (error) {
    console.warn("Unable to explicitly start LiveAvatar audio:", error);
  }

  if (!video) {
    return;
  }

  video.muted = false;
  video.volume = 1;

  try {
    await video.play();
  } catch (error) {
    console.warn("Browser blocked avatar playback until another user gesture:", error);
  }
}

async function sendSpeakText(session: LiveAvatarSession | null, text: string) {
  const sessionId = getSessionId(session);
  const publisher = getSessionInternals(session)?.room?.localParticipant;

  if (!sessionId || !publisher) {
    throw new Error("LiveAvatar room is not ready to receive speech commands.");
  }

  const payload = {
    event_id: crypto.randomUUID(),
    event_type: "avatar.speak_text",
    session_id: sessionId,
    source_event_id: null,
    text
  };

  const bytes = new TextEncoder().encode(JSON.stringify(payload));

  await publisher.publishData(bytes, {
    reliable: true,
    topic: "agent-control"
  });
}

function toLabel(state: SessionState) {
  switch (state) {
    case SessionState.CONNECTING:
      return "Connecting to LiveAvatar...";
    case SessionState.CONNECTED:
      return "LiveAvatar is ready.";
    case SessionState.DISCONNECTING:
      return "Stopping session...";
    case SessionState.DISCONNECTED:
      return "Session disconnected.";
    default:
      return "Waiting for session...";
  }
}

export default function LiveAvatarComponent({
  apiBaseUrl,
  playbackRequest,
  text
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const pendingSpeechRef = useRef("");
  const lastSpokenRef = useRef("");
  const [status, setStatus] = useState("Requesting LiveAvatar session...");
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const startSession = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/heygen/session-token`, {
          method: "POST"
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Unable to create a LiveAvatar session.");
        }

        const session = new LiveAvatarSession(data.sessionToken, {
          voiceChat: false
        });

        session.on(SessionEvent.SESSION_STATE_CHANGED, (state: SessionState) => {
          if (!isMounted) {
            return;
          }

          setStatus(toLabel(state));
          setIsReady(state === SessionState.CONNECTED);
        });

        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          if (!isMounted || !videoRef.current) {
            return;
          }

          session.attach(videoRef.current);
          void resumeAvatarAudio(session, videoRef.current);

          if (pendingSpeechRef.current) {
            void sendSpeakText(session, pendingSpeechRef.current)
              .then(() => {
                lastSpokenRef.current = pendingSpeechRef.current;
                pendingSpeechRef.current = "";
              })
              .catch((speakError) => {
                console.error("Speak error:", speakError);
              });
          }
        });

        session.on(SessionEvent.SESSION_DISCONNECTED, () => {
          if (!isMounted) {
            return;
          }

          setIsReady(false);
          setStatus("Session disconnected.");
        });

        session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
          if (!isMounted) {
            return;
          }

          setStatus("Avatar is speaking...");
        });

        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
          if (!isMounted) {
            return;
          }

          setStatus("LiveAvatar is ready.");
        });

        await session.start();

        if (!isMounted) {
          await session.stop();
          return;
        }

        sessionRef.current = session;
        setError("");
      } catch (err) {
        console.error("Avatar session error:", err);

        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Unable to start the LiveAvatar session."
        );
        setStatus("LiveAvatar failed to start.");
      }
    };

    void startSession();

    return () => {
      isMounted = false;
        const currentSession = sessionRef.current;
        sessionRef.current = null;

        if (currentSession) {
          void currentSession.stop().catch((stopError: unknown) => {
            console.error("Error stopping LiveAvatar session:", stopError);
          });
        }
      };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (playbackRequest === 0) {
      return;
    }

    const session = sessionRef.current;

    if (!session) {
      return;
    }

    void resumeAvatarAudio(session, videoRef.current);
  }, [playbackRequest]);

  useEffect(() => {
    const nextText = text.trim();

    if (!nextText || nextText === lastSpokenRef.current) {
      return;
    }

    const session = sessionRef.current;

    if (!session || !isReady) {
      pendingSpeechRef.current = nextText;
      return;
    }

    void resumeAvatarAudio(session, videoRef.current);
    void sendSpeakText(session, nextText)
      .then(() => {
        lastSpokenRef.current = nextText;
        pendingSpeechRef.current = "";
        setError("");
      })
      .catch((err) => {
        console.error("Speak error:", err);
        pendingSpeechRef.current = nextText;
        setError(err instanceof Error ? err.message : "Unable to send speech to LiveAvatar.");
      });
  }, [isReady, text]);

  return (
    <section className="avatar-card">
      <video
        ref={videoRef}
        className="avatar-video"
        autoPlay
        muted={false}
        playsInline
      />

      <div className="avatar-meta">
        <p className="status">{status}</p>
        {error ? <p className="message error">{error}</p> : null}
      </div>
    </section>
  );
}
