/** --------------------------------------------------------------------------
*
*            / \
*          / _ \               (°°)       Intelligent
*        / ___ \ [ \ [ \  [ \ [   ]       Programmable
*     _/ /   \ \_\  \/\ \/ /  |  | \      Personal
* (_)|____| |____|\__/\__/  [_| |_] \     Assistant
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
* Please support the project: https://patreon.com/francoislionet
*
* ----------------------------------------------------------------------------
* @file mediasoupserver.mjs
* @author FL (Francois Lionet)
* @version 0.5
*
* @short Connector opening a Mediasoup server on the machine
*        for classroom video sharing
*/
import ConnectorBase from '../../connector.mjs'
import { SERVERCOMMANDS } from '../../servercommands.mjs'
import * as mediasoup from 'mediasoup';
import os from 'os';
export { ConnectorMediasoupServer as Connector }

class ConnectorMediasoupServer extends ConnectorBase
{
    constructor( awi, config = {} ) {
        super( awi, config );
        this.name = 'Mediasoup Server';
        this.token = 'mediasoupServer';
        this.className = 'ConnectorMediasoupServer';
        this.group = 'network';
        this.version = '0.5';
        this.mediasoupWorkers = [];
        this.rooms = {}; // classroomId -> room object
        this.nextWorkerIdx = 0;
    }
    async connect(options) {
        super.connect(options);
        // Start mediasoup workers
        const numWorkers = options?.numWorkers || os.cpus().length;
        for (let i = 0; i < numWorkers; ++i) {
            const worker = await mediasoup.createWorker();
            worker.on('died', () => {
                this.awi.editor.print('Mediasoup worker died, exiting...', { user: 'awi' });
                process.exit(1);
            });
            this.mediasoupWorkers.push(worker);
        }
        this.awi.editor.print(`Started ${numWorkers} mediasoup workers`, { user: 'awi' });
        return this.setConnected(true);
    }
    async quit(options) {
        for (const worker of this.mediasoupWorkers) {
            await worker.close();
        }
        this.mediasoupWorkers = [];
        super.quit(options);
    }
    // Create a mediasoup room for a classroom
    async createClassroomMediasoupRoom(classroomId) {
        if (this.rooms[classroomId]) return this.rooms[classroomId];
        // Pick a worker in round-robin fashion
        const worker = this.mediasoupWorkers[this.nextWorkerIdx];
        this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.mediasoupWorkers.length;
        // Router supports audio+video
        const mediaCodecs = [
            {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2
            },
            {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
                parameters: {}
            }
        ];
        const router = await worker.createRouter({ mediaCodecs });
        const room = { router, transports: {}, producers: {}, consumers: {} };
        this.rooms[classroomId] = room;
        this.awi.editor.print(`Created mediasoup room for classroom ${classroomId}`, { user: 'awi' });
        return room;
    }

    // Called by classroomserver to set up teacher's transport
    async createTeacherTransport(classroomId, teacherHandle, options = {}) {
        const room = await this.createClassroomMediasoupRoom(classroomId);
        // Create a WebRTC transport for the teacher
        const transport = await room.router.createWebRtcTransport({
            listenIps: [{ ip: '0.0.0.0', announcedIp: options.announcedIp || null }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true
        });
        room.transports[teacherHandle] = transport;
        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        };
    }

    // Called by classroomserver when teacher sends offer/producer
    async connectTeacherTransport(classroomId, teacherHandle, dtlsParameters) {
        const room = this.rooms[classroomId];
        if (!room) throw new Error('Classroom not found');
        const transport = room.transports[teacherHandle];
        if (!transport) throw new Error('Transport not found');
        await transport.connect({ dtlsParameters });
        return true;
    }

    // Called by classroomserver when teacher produces media
    async createTeacherProducer(classroomId, teacherHandle, kind, rtpParameters) {
        const room = this.rooms[classroomId];
        if (!room) throw new Error('Classroom not found');
        const transport = room.transports[teacherHandle];
        if (!transport) throw new Error('Transport not found');
        const producer = await transport.produce({ kind, rtpParameters });
        room.producers[teacherHandle] = producer;
        return producer.id;
    }

    replyError(error, message) {
        if (message)
            this.reply({ error: error.getPrint ? error.getPrint() : error.toString() }, message);
        return error;
    }
    replySuccess(answer, message) {
        if (message)
            this.reply(answer.data, message);
        return answer;
    }
}

