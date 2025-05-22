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
        this.token = 'mediasoup';
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
    getClassroomMediasoupRoom(classroomId) {
        return this.rooms[classroomId];
    }

    // Called by classroomserver to set up teacher's transport
    async createTeacherTransport(classroomId, teacherHandle, options = {}) {
        const room = await this.createClassroomMediasoupRoom(classroomId);
        // Create a WebRTC transport for the teacher
        const transport = await room.router.createWebRtcTransport({
            listenIps: [{ ip: '0.0.0.0', announcedIp: options.announcedIp || '192.168.1.66' }],
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
        if (!room.producers[teacherHandle]) room.producers[teacherHandle] = {};
        room.producers[teacherHandle][kind] = producer;
        await producer.resume();
        console.log(`[mediasoup] Created producer for ${teacherHandle} kind=${kind} paused=${producer.paused}`);
        return producer.id;
    }

    // Called by classroomserver to set up student's transport
    async createStudentTransport(classroomId, studentHandle, options = {}) {
        const room = await this.createClassroomMediasoupRoom(classroomId);
        // Use same transport options as teacher
        const transport = await room.router.createWebRtcTransport({
            listenIps: [{ ip: '0.0.0.0', announcedIp: options.announcedIp || '192.168.1.66' }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true
        });
        room.transports[studentHandle] = transport;
        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        };
    }

    // Connect a student's transport with DTLS parameters
    async connectStudentTransport(classroomId, studentHandle, dtlsParameters) {
        const room = this.rooms[classroomId];
        if (!room) throw new Error('Classroom not found');
        const transport = room.transports[studentHandle];
        if (!transport) throw new Error('Transport not found');
        await transport.connect({ dtlsParameters });
        return true;
    }

    // Create a producer for the student's media (if students can produce)
    async createStudentProducer(classroomId, studentHandle, kind, rtpParameters) {
        const room = this.rooms[classroomId];
        if (!room) throw new Error('Classroom not found');
        const transport = room.transports[studentHandle];
        if (!transport) throw new Error('Transport not found');
        const producer = await transport.produce({ kind, rtpParameters });
        room.producers[studentHandle] = producer;
        return producer.id;
    }

    // Create a consumer for the student's transport to consume teacher's media
    async createStudentConsumer(classroomId, studentHandle, teacherHandle, kind, rtpCapabilities) {
        const room = this.rooms[classroomId];
        if (!room) throw new Error('Classroom not found');
        const studentTransport = room.transports[studentHandle];
        if (!studentTransport) throw new Error('Student transport not found');
        // Retrieve the teacher's producer for the requested kind
        const teacherProducers = room.producers[teacherHandle];
        if (!teacherProducers || !teacherProducers[kind]) return null;
        const teacherProducer = teacherProducers[kind];
        // Check RTP capabilities
        console.log(`[mediasoup] Student ${studentHandle} consuming kind=${kind} with rtpCapabilities=`, JSON.stringify(rtpCapabilities));
        const canConsume = room.router.canConsume({ producerId: teacherProducer.id, rtpCapabilities });
        console.log(`[mediasoup] canConsume for producerId=${teacherProducer.id} kind=${kind}:`, canConsume);
        if (!canConsume) {
            return null;
        }
        const consumer = await studentTransport.consume({
            producerId: teacherProducer.id,
            rtpCapabilities,
            paused: false
        });
        console.log(`[mediasoup] Created consumer for student=${studentHandle} kind=${kind} paused=${consumer.paused} producerPaused=${consumer.producerPaused}`);
        // Store consumer for cleanup
        if (!room.consumers[studentHandle]) room.consumers[studentHandle] = [];
        room.consumers[studentHandle].push(consumer);
        await consumer.resume();
        return {
            id: consumer.id,
            producerId: teacherProducer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            type: consumer.type,
            producerPaused: consumer.producerPaused
        };
    }

    // Disconnect and clean up the teacher's transport
    async disconnectTeacherTransport(classroomId, teacherHandle) {
        const room = this.rooms[classroomId];
        if (!room) throw new Error('Classroom not found');
        const transport = room.transports[teacherHandle];
        if (!transport) throw new Error('Transport not found');
        // Close associated producer if exists
        if (room.producers[teacherHandle]) {
            const teacherProducers = room.producers[teacherHandle];
            if (typeof teacherProducers === 'object' && teacherProducers !== null) {
                // Likely a teacher: close all kinds (audio, video, etc)
                for (const kind in teacherProducers) {
                    if (teacherProducers[kind] && typeof teacherProducers[kind].close === 'function') {
                        await teacherProducers[kind].close();
                    }
                }
            } else if (typeof teacherProducers?.close === 'function') {
                // Defensive: in case a single producer is stored
                await teacherProducers.close();
            } else {
                console.warn('Unexpected producer type for teacherHandle:', teacherProducers);
            }
            delete room.producers[teacherHandle];
        }
        await transport.close();
        delete room.transports[teacherHandle];
        return true;
    }

    // Disconnect and clean up the student's transport
    async disconnectStudentTransport(classroomId, studentHandle) {
        const room = this.rooms[classroomId];
        if (!room) throw new Error('Classroom not found');
        const transport = room.transports[studentHandle];
        if (!transport) throw new Error('Transport not found');
        // Close associated producer if exists (if students can produce)
        if (room.producers[studentHandle]) {
            await room.producers[studentHandle].close();
            delete room.producers[studentHandle];
        }
        await transport.close();
        delete room.transports[studentHandle];
        return true;
    }

    // Clean up all mediasoup resources for a classroom
    async endClassroom(classroomId) {
        const room = this.rooms[classroomId];
        if (!room) return true; // Already cleaned up
        // Close all producers
        for (const producer of Object.values(room.producers)) {
            try { await producer.close(); } catch (e) {}
        }
        // Close all consumers
        if (room.consumers) {
            for (const consumerList of Object.values(room.consumers)) {
                if (Array.isArray(consumerList)) {
                    for (const consumer of consumerList) {
                        try { await consumer.close(); } catch (e) {}
                    }
                } else if (consumerList) {
                    try { await consumerList.close(); } catch (e) {}
                }
            }
        }
        // Close all transports
        for (const transport of Object.values(room.transports)) {
            try { await transport.close(); } catch (e) {}
        }
        // Close the router
        if (room.router) {
            try { await room.router.close(); } catch (e) {}
        }
        delete this.rooms[classroomId];
        return true;
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

