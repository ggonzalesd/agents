import { mount } from 'svelte';
import '@/app.css';
import App from '@/App.svelte';

console.log(import.meta.env);

const app = mount(App, {
	target: document.getElementById('app')!,
});

export default app;
