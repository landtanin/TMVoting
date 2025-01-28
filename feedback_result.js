const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3333'
    : 'https://expressjs-postgres-production-6625.up.railway.app';
    
$(document).ready(function() {
    // Get session ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (!sessionId) {
        $('#feedback-container').html('<div class="alert alert-warning">No session ID provided</div>');
        return;
    }

    // Fetch feedback data
    $.ajax({
        url: `${API_BASE_URL}/api/feedback-sessions/${sessionId}/feedback`,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                displayFeedback(response);
            } else {
                $('#feedback-container').html('<div class="alert alert-danger">Error loading feedback</div>');
            }
        },
        error: function() {
            $('#feedback-container').html('<div class="alert alert-danger">Failed to load feedback</div>');
        }
    });
});

function displayFeedback(data) {
    // Display session info
    $('#speaker-name').text(`Speaker: ${data.session.speaker_name || 'Anonymous'}`);
    $('#session-title').text(data.session.title);

    // Display feedback responses
    const container = $('#feedback-container');
    container.empty();

    if (!data.responses || data.responses.length === 0) {
        container.html('<div class="alert alert-info">No feedback available yet</div>');
        return;
    }

    data.responses.forEach(feedback => {
        const feedbackHtml = `
            <div class="card feedback-card">
                <div class="card-body">
                    <div class="evaluator-name mb-2">
                        From: ${feedback.evaluator_name || 'Anonymous'}
                    </div>
                    <ul class="criteria-list mb-3">
                        ${feedback.criteria.map(c => `
                            <li class="criteria-badge">${c.name}</li>
                        `).join('')}
                    </ul>
                    <div class="feedback-content">
                        ${feedback.feedback_content}
                    </div>
                </div>
            </div>
        `;
        container.append(feedbackHtml);
    });
} 