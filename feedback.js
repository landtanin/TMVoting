const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3333'
    : 'https://expressjs-postgres-production-6625.up.railway.app';

$(document).ready(function() {
    // Declare closure variables at the top of the ready function
    let sessionTitle = '';
    let sessionSpeakerName = '';

    // Get session ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (!sessionId) {
        $('#feedbackForm').html('<div class="alert alert-danger">No session ID provided</div>');
        return;
    }
    
    $.get(`${API_BASE_URL}/api/feedback-sessions/${sessionId}`)
        .done(function(response) {
            if (response.success) {
                // Store in closure variables instead of window
                sessionTitle = response.session.title;
                sessionSpeakerName = response.session.speaker_name;
                
                // Populate speech info
                $('#speechTitle').text(sessionTitle);
                $('#speakerName').text(`Speaker: ${sessionSpeakerName}`);
                
                // Populate criteria chips
                const criteriaHtml = response.criteria.map(criterion => 
                    `<div class="criteria-chip" data-id="${criterion.id}" title="${criterion.description}">${criterion.name}</div>`
                ).join('');
                $('#criteriaChips').html(criteriaHtml);
                
                // Reattach click handlers for criteria chips
                attachChipHandlers();
            } else {
                console.error('Failed to load session data');
                $('#feedbackForm').html('<div class="alert alert-danger">Failed to load session data</div>');
            }
        })
        .fail(function(error) {
            console.error('Error fetching session data:', error);
            $('#feedbackForm').html('<div class="alert alert-danger">Error loading session data</div>');
        });

    function attachChipHandlers() {
        $('.criteria-chip').on('click', function() {
            $(this).toggleClass('selected');
        });
    }

    // Handle form submission
    $('#feedbackForm button').on('click', function() {
        const selectedCriteria = $('.criteria-chip.selected').map(function() {
            return $(this).data('id');
        }).get();

        const feedback = {
            evaluator_name: $('.evaluator-name').val(),
            content: $('textarea').val(),
            criteriaIds: selectedCriteria
        };

        // Disable the submit button to prevent double submissions
        $(this).prop('disabled', true);

        $.ajax({
            url: `${API_BASE_URL}/api/feedback-sessions/${sessionId}/feedback`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(feedback),
            success: function(response) {
                $('#feedbackForm').html(`
                    <div class="alert alert-success">
                        Thank you for your feedback on "${sessionTitle}" by ${sessionSpeakerName}!
                    </div>
                    <a href="https://linktr.ee/landtanin" class="btn btn-primary mt-3">Back to Home</a>
                `);
            },
            error: function(error) {
                console.error('Error submitting feedback:', error);
                $('#feedbackForm').append('<div class="alert alert-danger">Failed to submit feedback. Please try again.</div>');
                // Re-enable the submit button on error
                $('#feedbackForm button').prop('disabled', false);
            }
        });
    });
}); 