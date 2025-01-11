// Check if we're on the voting page
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

if (roomId) {
    // Show voter section
    $('#voterSection').removeClass('hidden');
    $('#adminSection').addClass('hidden');
    loadVotingRoom(roomId);
} else {
    // Show admin section
    $('#adminSection').removeClass('hidden');
    $('#voterSection').addClass('hidden');
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

$('#createEventForm').submit((e) => {
    e.preventDefault();
    const meetingDate = $('#meetingDate').val();
    const speakerNames = [];
    $('.speaker-input').each(function() {
        speakerNames.push($(this).val());
    });

    // Generate a random room ID
    const roomId = Math.random().toString(36).substring(2, 15);
    
    // Store the room data (in a real app, this would go to a database)
    const roomData = {
        date: meetingDate,
        speakers: speakerNames,
        votes: {}
    };
    localStorage.setItem(`room_${roomId}`, JSON.stringify(roomData));

    // Generate QR code
    const votingUrl = `${window.location.href}?room=${roomId}`;
    $('#votingLink').val(votingUrl);
    $('#qrCode').removeClass('hidden');
    $('#resultsSection').removeClass('hidden');
    
    new QRCode(document.getElementById("qrCodeImage"), {
        text: votingUrl,
        width: 200,
        height: 200
    });

    // Start monitoring results
    displayResults(roomId);
    setInterval(() => displayResults(roomId), 5000);
});

function copyLink() {
    const linkInput = document.getElementById('votingLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}

// Voter Section Logic
function loadVotingRoom(roomId) {
    const roomData = JSON.parse(localStorage.getItem(`room_${roomId}`));
    if (!roomData) {
        $('#voterSection').html('<div class="alert alert-danger">Invalid or expired voting room</div>');
        return;
    }

    const speakersHtml = roomData.speakers.map(speaker => `
        <div class="col-md-6">
            <div class="card vote-card">
                <div class="card-body">
                    <h5 class="card-title">${speaker}</h5>
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
    $('#submitVote').click(() => {
        const selectedSpeaker = $('.vote-card.selected .card-title').text();
        const voterKey = `voter_${roomId}_${Date.now()}`;
        
        // Store the vote (in a real app, this would go to a database)
        const roomData = JSON.parse(localStorage.getItem(`room_${roomId}`));
        if (!roomData.votes) roomData.votes = {};
        roomData.votes[voterKey] = selectedSpeaker;
        localStorage.setItem(`room_${roomId}`, JSON.stringify(roomData));

        // Show success message
        $('#voterSection').html(`
            <div class="alert alert-success">
                Thank you for voting! Your vote has been recorded.
            </div>
        `);
    });
}

// Results Display Logic
function displayResults(roomId) {
    const roomData = JSON.parse(localStorage.getItem(`room_${roomId}`));
    if (!roomData || !roomData.votes) return;

    // Count votes
    const voteCounts = {};
    roomData.speakers.forEach(speaker => voteCounts[speaker] = 0);
    Object.values(roomData.votes).forEach(vote => voteCounts[vote]++);

    // Display results
    const resultsHtml = Object.entries(voteCounts)
        .map(([speaker, count]) => `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                ${speaker}
                <span class="badge bg-primary rounded-pill">${count} votes</span>
            </div>
        `).join('');

    $('#voteResults').html(resultsHtml);
} 