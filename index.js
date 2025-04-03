const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3333'
    : 'https://expressjs-postgres-production-6625.up.railway.app';

let isAdmin = false;

let resultsInterval;

// Check if we're on the voting page
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room') || localStorage.getItem('adminRoomId');

if (roomId) {
    if (urlParams.get('room')) {
        // Voter view
        isAdmin = false;
        $('#voterSection').removeClass('hidden');
        $('#adminSection').addClass('hidden');
        $('#adminNav').addClass('hidden'); // Hide nav for voters
        loadVotingRoom(roomId);
    } else {
        // Admin view
        isAdmin = true;
        $('#adminSection').removeClass('hidden');
        $('#voterSection').addClass('hidden');
        $('#createEventForm').addClass('hidden');
        $('#qrCode').removeClass('hidden');
        $('#resultsSection').removeClass('hidden');
        $('#adminNav').removeClass('hidden'); // Show nav for admin
        
        // Regenerate the QR code and voting link
        const votingUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        $('#votingLink').val(votingUrl);
        
        // Fetch room data to get voting category
        fetch(`${API_BASE_URL}/api/rooms/${roomId}`)
            .then(response => response.json())
            .then(roomData => {
                $('#qrCodeTitle').text(roomData.voting_category.replace(/_/g, ' ').toUpperCase());
            });
        
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
    // Initial admin form view
    isAdmin = true;
    $('#adminSection').removeClass('hidden');
    $('#voterSection').addClass('hidden');
    $('#createEventForm').removeClass('hidden');
    $('#qrCode').addClass('hidden');
    $('#resultsSection').addClass('hidden');
    $('#adminNav').removeClass('hidden'); // Show nav for admin
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

// Loading spinner functions
function showLoading() {
    $('#loadingOverlay').removeClass('hidden');
}

function hideLoading() {
    $('#loadingOverlay').addClass('hidden');
}

$('#createEventForm').submit(async (e) => {
    e.preventDefault();
    showLoading();  // Show loading spinner
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
            $('#qrCodeTitle').text(votingCategory.replace(/_/g, ' ').toUpperCase());
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
    } finally {
        hideLoading();  // Hide loading spinner regardless of success/failure
    }
});

async function copyLink() {
    const linkInput = document.getElementById('votingLink');
    try {
        await navigator.clipboard.writeText(linkInput.value);
        alert('Link copied to clipboard!');
    } catch (err) {
        alert('Failed to copy link');
    }
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

        // Update the header to show the voting category
        $('#voterSection h2').text(`Vote ${roomData.voting_category.replace(/_/g, ' ').toUpperCase()}`);

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
                            Thank you for voting for ${selectedCard.find('.card-title').text()}!
                            Your vote has been recorded for ${roomData.voting_category.replace(/_/g, ' ').toUpperCase()}.
                        </div>
                        <a href="https://linktr.ee/Londonolympians" class="btn btn-primary mt-3">Back to Home</a>
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

        // Update the results section header to include the delete button
        $('#resultsSection h3').html(`
            <div class="d-flex justify-content-between align-items-center">
                <span>Live Results</span>
                <button 
                    onclick="deleteRoom('${roomId}', '${roomData.voting_category.replace(/_/g, ' ').toUpperCase()}')" 
                    class="btn btn-outline-danger btn-sm"
                    style="min-width: 70px;">
                    Delete Room
                </button>
            </div>
        `);

        // Display results based on the room data
        const resultsHtml = roomData.speakers
            .map(speaker => `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="me-2">${speaker.name}</span>
                        <button 
                            data-room-id="${roomId}"
                            data-speaker-id="${speaker.id}"
                            data-speaker-name="${btoa(encodeURIComponent(speaker.name))}"
                            class="btn btn-outline-secondary btn-sm me-1 edit-speaker-btn"
                            title="Edit name">
                            ✏️
                        </button>
                        <button 
                            data-room-id="${roomId}"
                            data-speaker-id="${speaker.id}"
                            data-speaker-name="${btoa(encodeURIComponent(speaker.name))}"
                            class="btn btn-outline-danger btn-sm delete-speaker-btn"
                            title="Delete speaker">
                            🗑️
                        </button>
                    </div>
                    <span class="badge bg-primary rounded-pill">${voteCounts[speaker.id] || 0} votes</span>
                </div>
            `).join('');

        // Add the "Add Speaker" button at the bottom
        const addSpeakerButton = `
            <div class="mt-3">
                <button 
                    onclick="addNewSpeaker('${roomId}')"
                    class="btn btn-outline-primary w-100">
                    Add New Speaker
                </button>
            </div>
        `;

        $('#voteResults').html(resultsHtml + addSpeakerButton);
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
    $('#roomsListSection').addClass('hidden');
    window.location.reload();
}

// Add this function to delete a room
async function deleteRoom(roomId, roomCategory) {
    if (!confirm(`Are you sure you want to delete the room "${roomCategory}"? This action cannot be undone.`)) {
        return;
    }

    showLoading(); // Show loading spinner
    try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log('Delete response status:', response.status);
        console.log('Delete response text:', responseText);

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
            // Refresh the rooms list
            showAllRooms();
        } else {
            alert(data.error || 'Failed to delete room. Please try again.');
        }
    } catch (error) {
        console.error('Failed to delete room:', error);
        alert('Failed to delete room. Please try again.');
    } finally {
        hideLoading(); // Hide loading spinner
    }
}

// Add this function to show all rooms
async function showAllRooms() {
    try {
        // Hide other sections and show rooms list
        $('#createEventForm').addClass('hidden');
        $('#qrCode').addClass('hidden');
        $('#resultsSection').addClass('hidden');
        $('#roomsListSection').removeClass('hidden');

        // Clear existing interval if any
        if (resultsInterval) {
            clearInterval(resultsInterval);
        }

        const response = await fetch(`${API_BASE_URL}/api/rooms`);
        const rooms = await response.json();

        // Sort rooms by creation date (newest first)
        rooms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const roomsHtml = rooms.map(room => `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between align-items-start">
                    <div onclick="loadExistingRoom('${room.id}')" style="cursor: pointer; flex-grow: 1;">
                        <h5 class="mb-1">${room.voting_category.replace(/_/g, ' ').toUpperCase()}</h5>
                        <p class="mb-1">Speakers: ${room.speakers.map(s => s.name).join(', ')}</p>
                        <small>Total Votes: ${room.votes ? room.votes.length : 0}</small>
                        <br>
                        <small>${new Date(room.created_at).toLocaleDateString()}</small>
                    </div>
                    <button 
                        onclick="event.stopPropagation(); deleteRoom('${room.id}', '${room.voting_category.replace(/_/g, ' ').toUpperCase()}')" 
                        class="btn btn-outline-danger btn-sm"
                        style="min-width: 70px;">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');

        $('#roomsList').html(roomsHtml || '<p class="text-center">No rooms found</p>');
    } catch (error) {
        console.error('Failed to load rooms:', error);
        $('#roomsList').html('<div class="alert alert-danger">Failed to load rooms</div>');
    }
}

// Add this function to load an existing room
function loadExistingRoom(roomId) {
    localStorage.setItem('adminRoomId', roomId);
    window.location.reload();
}

// Add this function to edit speaker name
async function editSpeakerName(roomId, speakerId, currentName) {
    const newName = prompt("Enter new name:", currentName);
    if (!newName || newName === currentName) return;

    showLoading(); // Show loading spinner
    try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/speakers/${speakerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            // Refresh the results to show the updated name
            displayResults(roomId);
        } else {
            alert(data.error || 'Failed to update speaker name. Please try again.');
        }
    } catch (error) {
        console.error('Failed to update speaker name:', error);
        alert('Failed to update speaker name. Please try again.');
    } finally {
        hideLoading(); // Hide loading spinner
    }
}

// Add this function to add a new speaker
async function addNewSpeaker(roomId) {
    const newName = prompt('Enter speaker name:');
    if (!newName) return;

    showLoading(); // Show loading spinner
    try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/speakers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            // Refresh the results to show the new speaker
            displayResults(roomId);
        } else {
            alert(data.error || 'Failed to add new speaker. Please try again.');
        }
    } catch (error) {
        console.error('Failed to add new speaker:', error);
        alert('Failed to add new speaker. Please try again.');
    } finally {
        hideLoading(); // Hide loading spinner
    }
}

// Add this function to delete a speaker
async function deleteSpeaker(roomId, speakerId, speakerName) {
    if (!confirm(`Are you sure you want to delete speaker "${speakerName}"? This action cannot be undone.`)) {
        return;
    }

    showLoading(); // Show loading spinner
    try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/speakers/${speakerId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            // Refresh the results to show the updated speaker list
            displayResults(roomId);
        } else {
            alert(data.error || 'Failed to delete speaker. Please try again.');
        }
    } catch (error) {
        console.error('Failed to delete speaker:', error);
        alert('Failed to delete speaker. Please try again.');
    } finally {
        hideLoading(); // Hide loading spinner
    }
}

// Add event listener for edit speaker buttons
$(document).on('click', '.edit-speaker-btn', function() {
    const roomId = $(this).data('room-id');
    const speakerId = $(this).data('speaker-id');
    const encodedName = $(this).data('speaker-name');
    const speakerName = decodeURIComponent(atob(encodedName));
    editSpeakerName(roomId, speakerId, speakerName);
});

// Add event listener for delete speaker buttons
$(document).on('click', '.delete-speaker-btn', function() {
    const roomId = $(this).data('room-id');
    const speakerId = $(this).data('speaker-id');
    const encodedName = $(this).data('speaker-name');
    const speakerName = decodeURIComponent(atob(encodedName));
    deleteSpeaker(roomId, speakerId, speakerName);
}); 