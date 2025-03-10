declare module 'livekit-server-sdk' {
  export class AccessToken {
    constructor(apiKey: string, apiSecret: string);
    addGrant(grant: any): void;
    toJwt(): string;
  }

  export class RoomServiceClient {
    constructor(url: string, apiKey: string, apiSecret: string);
    createRoom(options: any): Promise<Room>;
    listRooms(): Promise<Room[]>;
    deleteRoom(roomName: string): Promise<void>;
  }

  export interface Room {
    name: string;
    emptyTimeout?: number;
    maxParticipants?: number;
    creationTime?: number;
    turnPassword?: string;
    enabledCodecs?: any[];
    metadata?: string;
  }

  export interface VideoGrant {
    roomJoin?: boolean;
    room?: string;
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
  }
}
