import { useState, useRef, useCallback, useEffect } from 'react';

export const useWebRTC = (socketRef, currentUserId) => {
  const [callState, setCallState] = useState({
    isReceivingCall: false,
    callerSignal: null,
    callerId: '',
    callerName: '',
    isVideo: false,
    callAccepted: false,
    callEnded: true
  });

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();

  // Синхронизация потоков с video тегами
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, callState.callEnded, callState.callAccepted]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callState.callEnded, callState.callAccepted]);

  // STUN и TURN сервера для обхода NAT (чтобы звонки работали по всему миру)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  // Очистка медиа и соединения
  const cleanupCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop(); // Жестко выключаем камеру и микрофон
      });
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setLocalStream(null);
    setRemoteStream(null);
    setCallState(prev => ({
      ...prev,
      isReceivingCall: false,
      callAccepted: false,
      callEnded: true,
      callerSignal: null
    }));
  }, [localStream]);

  // Запрос доступа к устройствам
  const getMedia = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Ошибка доступа к медиаустройствам:', error);
      alert('Нет доступа к камере или микрофону. Проверьте разрешения браузера.');
      return null;
    }
  };

  // Инициация звонка
  const callUser = async (userToCall, isVideo = true, currentUserName) => {
    const stream = await getMedia(isVideo);
    if (!stream) return;

    setCallState(prev => ({ ...prev, callEnded: false, isVideo }));

    // Создаем peer connection
    const peer = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = peer;

    // Добавляем наши треки
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    // Обработка удаленного потока
    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Обмен ICE кандидатами
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice_candidate', {
          to: userToCall,
          candidate: event.candidate
        });
      }
    };

    // Создаем Offer
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    // Отправляем Offer собеседнику
    socketRef.current.emit('call_user', {
      userToCall,
      signalData: offer,
      from: currentUserId,
      name: currentUserName,
      isVideo
    });
  };

  // Принять звонок
  const answerCall = async () => {
    setCallState(prev => ({ ...prev, callAccepted: true }));

    const stream = await getMedia(callState.isVideo);
    if (!stream) {
      rejectCall();
      return;
    }

    const peer = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = peer;

    // Добавляем наши треки
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    // Получаем удаленные треки
    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Обмен ICE кандидатами
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice_candidate', {
          to: callState.callerId,
          candidate: event.candidate
        });
      }
    };

    // Устанавливаем удаленный Offer и создаем Answer
    await peer.setRemoteDescription(new RTCSessionDescription(callState.callerSignal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    // Отправляем Answer звонящему
    socketRef.current.emit('answer_call', {
      to: callState.callerId,
      signal: answer
    });
  };

  // Отклонить звонок
  const rejectCall = () => {
    socketRef.current.emit('reject_call', { to: callState.callerId });
    cleanupCall();
  };

  // Завершить звонок (своей кнопкой)
  const leaveCall = (partnerId) => {
    socketRef.current.emit('end_call', { to: partnerId });
    cleanupCall();
  };

  // Mute Audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  };

  // Mute Video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  };

  return {
    callState,
    setCallState,
    localVideoRef,
    remoteVideoRef,
    callUser,
    answerCall,
    rejectCall,
    leaveCall,
    cleanupCall,
    toggleAudio,
    toggleVideo,
    peerConnectionRef
  };
};
