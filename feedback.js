const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3333'
    : 'https://expressjs-postgres-production-6625.up.railway.app';

$(document).ready(function() {
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
                // Populate speech info
                $('#speechTitle').text(response.session.title);
                $('#speakerName').text(`Speaker: ${response.session.speaker_name}`);
                
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
            evaluatorName: $('.evaluator-name').val(),
            criteriaIds: selectedCriteria,
            content: $('textarea').val()
        };

        console.log('Feedback to submit:', feedback);
        // TODO: Add API call to submit feedback
    });
}); 