import YPartyKitProvider from "y-partykit/provider";
import { WebrtcProvider } from "y-webrtc";
import * as Y from 'yjs';


export class YJsClient {
    gameID: string;
    ydoc: Y.Doc;
    yPartyProvider: YPartyKitProvider;
    webrtcProvider: any;

    constructor(gameID: string) {
        this.gameID = gameID;
        this.ydoc = new Y.Doc();
        this.yPartyProvider = new YPartyKitProvider("https://rt-scoreboard-party.yuetau.partykit.dev", this.gameID, this.ydoc);
        this.webrtcProvider = location.protocol == 'https:' ? new WebrtcProvider(this.gameID, this.ydoc, {password: "RT-ScoreBoardIsGreat", signaling: ["wss://wrtc1.ustrobocon.win", "wss://wrtc2.ustrobocon.win"]}) : undefined;
    }

    getYDoc() {
        return this.ydoc;
    }

    getYPartyProvider() {
        return this.yPartyProvider;
    }

    getWebrtcProvider() {
        return this.webrtcProvider;
    }

    destroy() {
        this.yPartyProvider.disconnect();
        location.protocol == 'https:' && this.webrtcProvider.destory();
    }
}