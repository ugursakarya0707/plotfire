declare module 'livekit-client' {
  export class Room {
    connect(url: string, token: string): Promise<void>;
    disconnect(): void;
    localParticipant: LocalParticipant;
    state: string;
    // Diğer özellikler...
  }

  export class LocalParticipant {
    publishTrack(track: MediaStreamTrack, options?: any): Promise<any>;
    setMicrophoneEnabled(enabled: boolean): Promise<boolean>;
    setCameraEnabled(enabled: boolean): Promise<boolean>;
    // Diğer özellikler...
  }

  // Diğer sınıflar ve arayüzler...
}

declare module '@livekit/components-react' {
  import React from 'react';
  
  export const LiveKitRoom: React.FC<{
    serverUrl: string;
    token: string;
    connectOptions?: any;
    children?: React.ReactNode;
  }>;
  
  export const VideoConference: React.FC<{
    chatMessageFormatter?: (message: any) => React.ReactNode;
  }>;
  
  export const RoomAudioRenderer: React.FC;
  export const ControlBar: React.FC;
  export const GridLayout: React.FC;
  export const ParticipantTile: React.FC<{ participant: any }>;
  
  // Diğer bileşenler...
}

declare module '@livekit/components-styles' {
  // Stil tanımlamaları
}
