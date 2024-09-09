// Function to handle the merge operation
async function handleMerge(type, mergeBy) {
    try {
        const response = await fetch('/api/merge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, mergeBy })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Failed to merge: ${data.error}`);
        }

        document.getElementById('result').textContent = `Merge successful: ${JSON.stringify(data)}`;
    } catch (error) {
        document.getElementById('result').textContent = `Error: ${error.message}`;
    }
}

// Function to update the "Merge by" options based on the selected "Merge Type"
function updateMergeByOptions() {
    const mergeType = document.getElementById('mergeType').value;
    const mergeBySelect = document.getElementById('mergeBy');

    let options = [];

    if (mergeType === 'persons') {
        options = [
            { value: 'email', text: 'Email' },
            { value: 'name', text: 'Name' },
            { value: 'phone', text: 'Phone' }
        ];
    } else if (mergeType === 'organizations') {
        options = [
            { value: 'name', text: 'Name' },
            { value: 'address', text: 'Address' }
        ];
    }

    // Clear existing options
    mergeBySelect.innerHTML = '';

    // Add new options
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.text;
        mergeBySelect.appendChild(opt);
    });
}

// Event listener for the merge type dropdown
document.getElementById('mergeType').addEventListener('change', updateMergeByOptions);

// Event listener for the merge button
document.getElementById('mergeBtn').addEventListener('click', () => {
    const mergeType = document.getElementById('mergeType').value;
    const mergeBy = document.getElementById('mergeBy').value;
    handleMerge(mergeType, mergeBy);
});

// Initialize options on page load
updateMergeByOptions();
