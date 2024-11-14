import * as vscode from 'vscode';

let file_opening_time: Map<string, number> = new Map();
let file_times_counter: Map<string, number> = new Map();




export function activate(context: vscode.ExtensionContext) {
	function get_file_times_counter() {
		const file_times_counter_obj = context.globalState.get('file_times_counter', {} as { [key: string]: number });
		return new Map<string, number>(Object.entries(file_times_counter_obj));
	}

	function update_file_times_counter(file_times_counter : Map<string, number>) {
		context.globalState.update('file_times_counter', Object.fromEntries(file_times_counter.entries()));
	}

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

		console.log(`res is ${res}`);

		return res;
	}

	
	console.log('File Time Tracker is now active');
	vscode.window.showInformationMessage("File Time Tracker is now active")
	context.globalState.update('file_times_counter', Object.fromEntries(file_times_counter.entries()));

	
	const disposable = vscode.commands.registerCommand('code-timer.showFileTimes', () => {
		const stored_time_spent = context.globalState.get('file_times_counter')!;
		let timeReport: string[] = [];
		for (const [filePath, time] of Object.entries(stored_time_spent).sort()) {
			timeReport.push(`${filePath}: ${make_pretty_time(time)}`);
		}
		vscode.window.showQuickPick(timeReport);
    });
	context.subscriptions.push(disposable);

	
	vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        const filePath = document.uri.fsPath;
        if (!file_opening_time.has(filePath)) {
			file_opening_time.set(filePath, Date.now());
			vscode.window.showInformationMessage("Wrote opening time")
        }
    });
	
	vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
	// vscode.window.onDidChangeVisibleTextEditors((document: any) => {
		// if (typeof document == undefined) {
		// 	vscode.window.showErrorMessage("Unable to access current TextEditor")
		// 	return;
		// }
		// document = document.document;

        const filePath = document.uri.fsPath;
        const openTime = file_opening_time.get(filePath);
		
        if (openTime) {
			const ms_passed = Date.now() - openTime;
			const seconds_passed = Math.round(ms_passed / 1000);
			if (seconds_passed < 1) {
				return;
			}
            // console.log(`File: ${filePath} was open for ${ms_passed}ms`);
            // console.log(`File: ${filePath} was open for ${seconds_passed} secs`);
			
            // You can store this data in globalState or workspaceState for persistence
            // const timeSpent = context.globalState.get('fileTimeSpent', {} as { [key: string]: number });
            // let file_times_counter = context.globalState.get<Map<string, number>>('file_times_counter')!;
			
			// const file_times_counter_obj = context.globalState.get('file_times_counter', {} as { [key: string]: number });
			let file_times_counter = get_file_times_counter();
			
			let value = 0;
			if (file_times_counter.has(filePath)) {
				value = file_times_counter.get(filePath)!;
			}
			
            file_times_counter.set(filePath, value + seconds_passed);
			
            // context.globalState.update('fileTimeSpent', timeSpent);
			// const file_times_counter = Object.fromEntries(file_times_counter);
			// let file_times_counter = new Map<string, number>(Object.en	tries(storedTimeSpent));
			// const storedTimeSpent = context.globalState.get('file_times_counter', {} as { [key: string]: number });
            // context.globalState.update('file_times_counter', file_times_counter);

			update_file_times_counter(file_times_counter);
			vscode.window.showInformationMessage(`file ${filePath} was open for 
				${make_pretty_time(file_times_counter.get(filePath)!)}`);
			console.log((`Spend on ${filePath} ${file_times_counter.get(filePath)!} seconds`));
        }

        file_opening_time.delete(filePath);
    });
	
	
	// const disposable = vscode.commands.registerCommand('code-timer.helloWorld', () => {
		// vscode.window.showInformationMessage('Hello World from code-timer Vs Code!');
	// });

	// context.subscriptions.push(disposable);

}

// export function deactivate() {

// }
