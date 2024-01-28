var durationChart = document.getElementById('durationChart').getContext('2d');
var consumerChart = document.getElementById('consumerChart').getContext('2d');

var myChart = new Chart(durationChart, {
    type: 'bar',
    data: {
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange', 'Purple'],
        datasets: [{
            label: 'Duration(Min)',
            data: [12, 19, 3, 5, 2, 3, 1, 2],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
            ],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        responsive: true
    }
});

var myChart = new Chart(consumerChart, {
    type: 'bar',
    data: {
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange', 'Purple', 'Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange', 'Purple', 'Purple'],
        datasets: [{
            label: 'Suffered Consumers',
            data: [12, 19, 3, 5, 2, 3, 1, 2],
            backgroundColor: [
                'rgb(67, 71, 95)',
                
            ],
            borderColor: [
                'rgb(28, 29, 50)',
            ],
            borderWidth: 2
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        responsive: true
    }
});

