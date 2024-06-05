const hostVideo = document.getElementById('hostVideo');
const viewerVideo = document.getElementById('viewerVideo');
const socket = io();

let peerConnection;
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    hostVideo.srcObject = stream;

    socket.on('offer', async (offer) => {
      if (!peerConnection) {
        createPeerConnection();
      }
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('candidate', async (candidate) => {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    createPeerConnection();
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  })
  .catch(error => {
    console.error('Error accessing media devices.', error);
  });

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);
  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('candidate', candidate);
    }
  };
  peerConnection.ontrack = (event) => {
    viewerVideo.srcObject = event.streams[0];
  };
  peerConnection.onnegotiationneeded = async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
  };
}
