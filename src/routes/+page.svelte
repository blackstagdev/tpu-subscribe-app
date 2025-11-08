<script>
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	// Reactive store to hold your message
	const message = writable('Running subscription check...');

	onMount(async () => {
		try {
			// Call your API endpoint
			const res = await fetch('/api/check-subs');

			if (!res.ok) {
				message.set(`❌ Error: ${res.status}`);
				return;
			}

			const data = await res.json();
			message.set(`✅ ${data.message}`);
			console.log(data);
		} catch (err) {
			console.error('Fetch error:', err);
			message.set('❌ Failed to reach server');
		}
	});
</script>

<main class="p-6">
	<h1 class="mb-4 text-2xl font-bold">Student Subscription Automation</h1>

	<p class="text-gray-700">
		{$message}
	</p>

	<button
		class="mt-6 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
		on:click={() => location.reload()}
	>
		🔁 Run Again
	</button>
</main>
