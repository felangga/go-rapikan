import * as vscode from "vscode";
import { exec } from "child_process";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand("go-rapikan.sortImports", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    const document = editor.document;
    const filePath = document.uri.fsPath;

    // 1. Jalankan `go fmt` pada file aktif
    exec(`go fmt ${filePath}`, (err, stdout, stderr) => {
      if (err) {
        vscode.window.showErrorMessage(`go fmt error: ${stderr}`);
        return;
      }

      // Simpan & reload dokumen setelah fmt
      document.save().then(() => {
        vscode.workspace.openTextDocument(filePath).then((doc) => {
          vscode.window.showTextDocument(doc).then((editor) => {
            // 2. Rapikan imports
            runRapikanImports(editor);
          });
        });
      });
    });
  });

  context.subscriptions.push(disposable);
}

function runRapikanImports(editor: vscode.TextEditor) {
  const document = editor.document;
  const text = document.getText();

  const importRegex = /import\s*\(([\s\S]*?)\)/m;
  const match = text.match(importRegex);

  if (!match) {
    vscode.window.showInformationMessage("No imports found");
    return;
  }

  const importBlock = match[1];
  const imports = importBlock
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("//"));

  const stdLib: string[] = [];
  const external: string[] = [];
  // Map: groupName -> array of imports
  const internalGroups: Record<string, string[]> = {};

  // Cari username github internal secara dinamis
  let internalUsernames: Set<string> = new Set();
  imports.forEach(imp => {
    const pkg = imp.replace(/".*?"/, match => match).replace(/"/g, "");
    if (pkg.startsWith("github.com/")) {
      const parts = pkg.split("/");
      if (parts.length > 2) {
        internalUsernames.add(parts[1]);
      }
    }
  });

  // Kelompokkan imports secara dinamis berdasarkan group setelah username
  imports.forEach(imp => {
    const pkg = imp.replace(/".*?"/, match => match).replace(/"/g, "");

    if (!pkg.includes(".")) {
      stdLib.push(imp);
      return;
    }

    let matchedInternal = false;
    internalUsernames.forEach(username => {
      const prefix = `github.com/${username}/`;
      if (pkg.startsWith(prefix)) {
        const parts = pkg.substring(prefix.length).split("/");
        const groupName = parts[0];
        if (!internalGroups[groupName]) internalGroups[groupName] = [];
        internalGroups[groupName].push(imp);
        matchedInternal = true;
      }
    });
    if (!matchedInternal) {
      external.push(imp);
    }
  });

  const sortGroup = (group: string[]) => group.sort((a, b) => a.localeCompare(b));

  // Build final import block with dynamic groups
  const allGroups: string[][] = [];
  
  if (stdLib.length > 0) allGroups.push(sortGroup(stdLib));
  if (external.length > 0) allGroups.push(sortGroup(external));
  
  Object.keys(internalGroups).sort().forEach(groupName => {
    if (internalGroups[groupName].length > 0) {
      allGroups.push(sortGroup(internalGroups[groupName]));
    }
  });

  let importLines: string[] = [];
  allGroups.forEach((group, idx) => {
    if (idx > 0) {
      importLines.push(""); // add empty line between non-empty groups
    }
    group.forEach(imp => {
      importLines.push(`\t${imp}`);
    });
  });

  const newImportBlock = "import (\n" + importLines.join("\n") + "\n)";

  const edit = new vscode.WorkspaceEdit();
  const start = document.positionAt(match.index || 0);
  const end = document.positionAt((match.index || 0) + match[0].length);
  edit.replace(document.uri, new vscode.Range(start, end), newImportBlock);

  vscode.workspace.applyEdit(edit);
  vscode.window.showInformationMessage("Selesai merapikan 🎉");
}

export function deactivate() {}
