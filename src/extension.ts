import * as vscode from 'vscode';
let file_opening_time: Map<string, number> = new Map();
let context : vscode.ExtensionContext;

function make_pretty_time(seconds : number) {
	let res = '';
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	seconds = Math.floor(seconds % 60);

	if (hours > 0) {
		res += `${hours} h `;
	}
	if (minutes > 0 || hours > 0) {
		res += `${minutes} m `;
	}
	res += `${seconds} s`;

	return res;
}

function shorten_path(path : string, start_folders = 2, end_folders = 2, max_len = 50) {
	let separator;
	if (path.includes('\\')) {
		separator = '\\';
	} else if (path.includes('/')) {
		separator = '/';
	} else {
		console.log(`unable to shorten path: ${path}`);
		return path;
	}
	let splitted_path = path.split(separator);
	if (splitted_path.length <= start_folders + end_folders) {
		return path;
	}
	let shortened_path = [...splitted_path.slice(0, start_folders), '...', ...splitted_path.slice(-end_folders)].join(separator)
	while (shortened_path.length >= max_len && (end_folders > 1 || start_folders > 0)) {
		start_folders = Math.max(0, start_folders - 1);
		end_folders = Math.max(1, end_folders - 1);
		shortened_path = [...splitted_path.slice(0, start_folders), '...', ...splitted_path.slice(-end_folders)].join(separator)
	}
	return shortened_path;
}
function get_file_times_counter() {
	return new Map<string, number>(Object.entries(
		context.workspaceState.get('file_times_counter', {} as { [key: string]: number })));
}

function update_file_times_counter(file_times_counter : Map<string, number>) {
	context.workspaceState.update('file_times_counter', Object.fromEntries(file_times_counter.entries()));
}
	
function start_file_timer(filePath: string) {
	console.log(`start_file_timer called with filePath=${filePath}`);

	if (!file_opening_time.has(filePath)) {
		file_opening_time.set(filePath, Date.now());
	}
}
	
function update_time_on_files(filePath?: string) {
	console.log(`update_time_on_files called with filePath=${filePath}`);

	if (filePath === undefined) {
		for (const [filePath, time] of file_opening_time.entries()) {
			update_time_on_files(filePath);
			start_file_timer(filePath);
		}
	} else {
		const openTime = file_opening_time.get(filePath);
		
		if (openTime) {
			const ms_passed = Date.now() - openTime;
			const seconds_passed = Math.round(ms_passed / 1000);
			if (seconds_passed < 1) {
				return;
			}
			let file_times_counter = get_file_times_counter();
			
			let value = 0;
			if (file_times_counter.has(filePath)) {
				value = file_times_counter.get(filePath)!;
			}
			
			file_times_counter.set(filePath, value + seconds_passed);
			update_file_times_counter(file_times_counter);				
			file_opening_time.delete(filePath);
			
			return file_times_counter.get(filePath);
		}
	}
}

function show_file_times() {
	console.log('showFileTimes called');
	update_time_on_files();
	
	const stored_time_spent = context.workspaceState.get('file_times_counter')!;
	let timeReport: string[] = [];
	for (const [filePath, time] of Object.entries(stored_time_spent).sort((a, b) => b[1] - a[1])) {
		if (time != 0) {
			timeReport.push(`${shorten_path(filePath)}: ${make_pretty_time(time)}`);
		}
	}
	vscode.window.showQuickPick(timeReport);
}

function delete_file_time(file_path : string) {
	let file_times_counter = get_file_times_counter();
	file_times_counter.set(file_path, 0);
	file_opening_time.delete(file_path);
	update_file_times_counter(file_times_counter)
}

function erase_one_file_time() {
	update_time_on_files();
	const stored_time_spent = context.workspaceState.get('file_times_counter')!;
	let files: vscode.QuickPickItem[] = [];
	for (const [filePath, time] of Object.entries(stored_time_spent).sort()) {
		if (time != 0) {
			files.push({
				label: `${shorten_path(filePath)}: ${make_pretty_time(time)}`, 
				description: filePath});
		}
	}

	vscode.window.showQuickPick(files, {
		placeHolder: 'Select a file to clear its time'
	}).then((selection) => {
		if (selection) {
			console.log(selection);
			delete_file_time(selection.description!);
		}
	});
}

function erase_all_times() {
	const stored_time_spent = context.workspaceState.get('file_times_counter')!;
	for (const [filePath, time] of Object.entries(stored_time_spent).sort((a, b) => b[1] - a[1])) {
		delete_file_time(filePath);
	}
}


export function activate(local_context: vscode.ExtensionContext) {
	context = local_context;

	console.log('File Time Tracker is now active');
	vscode.window.showInformationMessage("File Time Tracker is now active")

    if (!context.workspaceState.get<Map<string, number>>('file_times_counter')) {
        context.workspaceState.update('file_times_counter', new Map<string, number>());
	}
	vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
		// in future check options what files to ignore 
		let re = /(?:\.([^.]+))?$/;
		const file_extension = re.exec(document.uri.fsPath)
		if (file_extension == undefined || file_extension[1] == "git") {
			return;
		}		
		start_file_timer(document.uri.fsPath);
    });
	
	vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
		const time = update_time_on_files(document.uri.fsPath);
		// if (time) {
			// vscode.window.showInformationMessage(
				// `${shorten_path(document.uri.fsPath, 2, 2, 30)} was open for ${make_pretty_time(time)}`)
		// }
	});
	
	let disposable = vscode.commands.registerCommand('code-timer.showFileTimes', show_file_times);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('code-timer.eraseOneFileTime', erase_one_file_time);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('code-timer.eraseAllTimes', erase_all_times);
	context.subscriptions.push(disposable);
}

export function deactivate() {
	update_time_on_files();
}
