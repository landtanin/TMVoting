const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3333'
    : 'https://expressjs-postgres-production-6625.up.railway.app';

let resultsInterval;

// Check if we're on the voting page
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room') || localStorage.getItem('adminRoomId');

if (roomId) {
    if (urlParams.get('room')) {
        // Show voter section for voting URL
        $('#voterSection').removeClass('hidden');
        $('#adminSection').addClass('hidden');
        loadVotingRoom(roomId);
    } else {
        // Show admin dashboard for stored admin room
        $('#adminSection').removeClass('hidden');
        $('#voterSection').addClass('hidden');
        $('#createEventForm').addClass('hidden');
        $('#qrCode').removeClass('hidden');
        $('#resultsSection').removeClass('hidden');
        
        // Regenerate the QR code and voting link
        const votingUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        $('#votingLink').val(votingUrl);
        
        new QRCode(document.getElementById("qrCodeImage"), {
            text: votingUrl,
            width: 200,
            height: 200
        });

        // Only show results for admin
        displayResults(roomId);
        if (resultsInterval) {
            clearInterval(resultsInterval);
        }
        resultsInterval = setInterval(() => displayResults(roomId), 5000);
    }
} else {
    // Show initial admin form
    $('#adminSection').removeClass('hidden');
    $('#voterSection').addClass('hidden');
    $('#createEventForm').removeClass('hidden');
    $('#qrCode').addClass('hidden');
    $('#resultsSection').addClass('hidden');
}

// Admin Section Logic
let speakers = 1;

$('#addSpeaker').click(() => {
    speakers++;
    const newSpeaker = `
        <div class="input-group mb-2">
            <input type="text" class="form-control speaker-input" placeholder="Speaker name" required>
            <button type="button" class="btn btn-outline-secondary remove-speaker">Remove</button>
        </div>
    `;
    $('#speakersContainer').append(newSpeaker);
    updateRemoveButtons();
});

$(document).on('click', '.remove-speaker', function() {
    $(this).closest('.input-group').remove();
    speakers--;
    updateRemoveButtons();
});

function updateRemoveButtons() {
    const removeButtons = $('.remove-speaker');
    if (speakers === 1) {
        removeButtons.prop('disabled', true);
    } else {
        removeButtons.prop('disabled', false);
    }
}

$('#createEventForm').submit(async (e) => {
    e.preventDefault();
    const votingCategory = $('#votingCategory').val();
    const speakerNames = [];
    $('.speaker-input').each(function() {
        speakerNames.push($(this).val());
    });

    const requestBody = {
        votingCategory,
        speakers: speakerNames
    };
    
    console.log('Sending request with body:', requestBody);

    try {
        const response = await fetch(`${API_BASE_URL}/api/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', responseText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            console.error('Raw response:', responseText);
            throw new Error('Invalid JSON response from server');
        }

        if (data.success) {
            // Store the room ID for admin persistence
            localStorage.setItem('adminRoomId', data.roomId);
            
            // Generate voting room URL using the returned roomId
            const votingUrl = `${window.location.href}?room=${data.roomId}`;
            
            // Show QR code section
            $('#votingLink').val(votingUrl);
            $('#qrCode').removeClass('hidden');
            $('#resultsSection').removeClass('hidden');
            $('#createEventForm').addClass('hidden');
            
            new QRCode(document.getElementById("qrCodeImage"), {
                text: votingUrl,
                width: 200,
                height: 200
            });

            // Start monitoring results
            displayResults(data.roomId);
            if (resultsInterval) {
                clearInterval(resultsInterval);
            }
            resultsInterval = setInterval(() => displayResults(data.roomId), 5000);
        } else {
            alert(data.error || 'Failed to create room. Please try again.');
        }
    } catch (error) {
        console.error('Failed to create room:', error);
        alert('Failed to create room. Please try again.');
    }
});

function copyLink() {
    const linkInput = document.getElementById('votingLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}

// Voter Section Logic
async function loadVotingRoom(roomId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`);
        const roomData = await response.json();
        
        if (!response.ok) {
            $('#voterSection').html('<div class="alert alert-danger">Invalid or expired voting room</div>');
            return;
        }

        const speakersHtml = roomData.speakers.map(speaker => `
            <div class="col-md-6">
                <div class="card vote-card" data-speaker-id="${speaker.id}">
                    <div class="card-body">
                        <h5 class="card-title">${speaker.name}</h5>
                        <p class="card-text">Click to select</p>
                    </div>
                </div>
            </div>
        `).join('');

        $('#speakersList').html(speakersHtml);

        // Handle vote selection
        $('.vote-card').click(function() {
            $('.vote-card').removeClass('selected');
            $(this).addClass('selected');
            $('#submitVote').prop('disabled', false);
        });

        // Handle vote submission
        $('#submitVote').click(async () => {
            const selectedCard = $('.vote-card.selected');
            if (!selectedCard.length) return;

            const speakerId = selectedCard.data('speaker-id');
            const voterId = localStorage.getItem('voterId') || crypto.randomUUID();
            localStorage.setItem('voterId', voterId);

            try {
                const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/vote`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    // credentials: 'include',
                    // mode: 'cors',
                    body: JSON.stringify({
                        voterId,
                        speakerId
                    })
                });

                const data = await response.json();
                if (data.success) {
                    // Show success message
                    $('#voterSection').html(`
                        <div class="alert alert-success">
                            Thank you for voting! Your vote has been recorded.
                        </div>
                    `);
                } else {
                    alert(data.error || 'Failed to submit vote. Please try again.');
                }
            } catch (error) {
                console.error('Failed to submit vote:', error);
                alert('Failed to submit vote. Please try again.');
            }
        });
    } catch (error) {
        console.error('Failed to load room:', error);
        $('#voterSection').html('<div class="alert alert-danger">Failed to load voting room</div>');
    }
}

// Results Display Logic
async function displayResults(roomId) {
    try {
        console.log('Fetching results for room:', roomId);
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`);
        
        if (!response.ok) {
            console.error('Response not OK:', response.status);
            return;
        }

        const roomData = await response.json();
        console.log('Received room data:', roomData);

        // Count votes for each speaker
        const voteCounts = {};
        if (roomData.votes) {
            roomData.votes.forEach(vote => {
                voteCounts[vote.speaker_id] = (voteCounts[vote.speaker_id] || 0) + 1;
            });
        }

        // Display results based on the room data
        const resultsHtml = roomData.speakers
            .map(speaker => `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    ${speaker.name}
                    <span class="badge bg-primary rounded-pill">${voteCounts[speaker.id] || 0} votes</span>
                </div>
            `).join('');

        $('#voteResults').html(resultsHtml);
    } catch (error) {
        console.error('Failed to load results:', error);
    }
}

// Add a new function to handle admin logout
function resetAdmin() {
    if (resultsInterval) {
        clearInterval(resultsInterval);
    }
    localStorage.removeItem('adminRoomId');
    window.location.reload();
} 