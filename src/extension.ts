import * as vscode from "vscode";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface ImportGroup {
  stdLib: string[];
  external: string[];
  companyExternal: string[];
  internal: Record<string, string[]>;
}

export function activate(context: vscode.ExtensionContext) {
  // Manual command for organizing imports
  const disposable = vscode.commands.registerCommand("go-rapikan.organizeCodes", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    await processGoFile(editor.document);
  });

  // Auto-organize imports on save for Go files
  const onSaveDisposable = vscode.workspace.onWillSaveTextDocument(async (event) => {
    const document = event.document;
    
    // Only process Go files
    if (document.languageId !== 'go') {
      return;
    }

    // Check if auto-organize is enabled (you can make this configurable)
    const config = vscode.workspace.getConfiguration('go-rapikan');
    const autoOrganize = config.get('organizeOnSave', true);
    
    if (autoOrganize) {
      event.waitUntil(processGoFileOnSave(document));
    }
  });

  context.subscriptions.push(disposable, onSaveDisposable);
}

async function processGoFile(document: vscode.TextDocument): Promise<void> {
  try {
    const filePath = document.uri.fsPath;
    
    // Run go fmt first
    await runGoFmt(filePath);
    
    // Save and reload document
    await document.save();
    const doc = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(doc);
    
    // Organize imports
    await organizeImports(editor);
  } catch (error) {
    vscode.window.showErrorMessage(`Error processing Go file: ${error}`);
    throw error;
  }
}

async function processGoFileOnSave(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
  try {
    const filePath = document.uri.fsPath;
    
    // Run go fmt first
    await runGoFmt(filePath);
    
    // Get import organization edits
    const edits = await getImportOrganizationEdits(document);
    return edits;
  } catch (error) {
    console.error(`Error processing Go file on save: ${error}`);
    return [];
  }
}

async function runGoFmt(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`go fmt "${filePath}"`, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`go fmt error: ${stderr}`));
      } else {
        resolve();
      }
    });
  });
}

async function organizeImports(editor: vscode.TextEditor): Promise<void> {
  const edits = await getImportOrganizationEdits(editor.document);
  
  if (edits.length > 0) {
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(editor.document.uri, edits);
    await vscode.workspace.applyEdit(workspaceEdit);
    vscode.window.showInformationMessage("Imports organized successfully! 🎉");
  } else {
    vscode.window.showInformationMessage("No imports found or imports are already organized");
  }
}

async function getImportOrganizationEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
  const text = document.getText();
  const importRegex = /import\s*\(([\s\S]*?)\)/m;
  const match = text.match(importRegex);

  if (!match) {
    return [];
  }

  const currentModule = await getCurrentModuleName(document.uri.fsPath);
  const imports = parseImports(match[1]);
  const groups = categorizeImports(imports, currentModule);
  const newImportBlock = buildImportBlock(groups);

  // Only create edit if the import block has actually changed
  if (match[0] !== newImportBlock) {
    const start = document.positionAt(match.index || 0);
    const end = document.positionAt((match.index || 0) + match[0].length);
    return [vscode.TextEdit.replace(new vscode.Range(start, end), newImportBlock)];
  }

  return [];
}

async function getCurrentModuleName(filePath: string): Promise<string | null> {
  const goModPath = findGoModPath(filePath);
  if (goModPath) {
    return getModuleName(goModPath);
  }
  return null;
}

function parseImports(importBlock: string): string[] {
  return importBlock
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("//"));
}

function categorizeImports(imports: string[], currentModule: string | null): ImportGroup {
  const groups: ImportGroup = {
    stdLib: [],
    external: [],
    companyExternal: [],
    internal: {}
  };

  const companyName = getCompanyName(currentModule);

  imports.forEach(imp => {
    const pkg = extractPackagePath(imp);

    if (isStandardLibrary(pkg)) {
      groups.stdLib.push(imp);
    } else if (isInternalImport(pkg, currentModule)) {
      const groupName = getInternalGroupName(pkg, currentModule!);
      if (!groups.internal[groupName]) {
        groups.internal[groupName] = [];
      }
      groups.internal[groupName].push(imp);
    } else if (isCompanyExternal(pkg, companyName)) {
      groups.companyExternal.push(imp);
    } else {
      groups.external.push(imp);
    }
  });

  return groups;
}

function extractPackagePath(importLine: string): string {
  const quotedMatch = importLine.match(/"([^"]+)"/);
  return quotedMatch ? quotedMatch[1] : importLine;
}

function isStandardLibrary(pkg: string): boolean {
  return !pkg.includes(".");
}

function isInternalImport(pkg: string, currentModule: string | null): boolean {
  return currentModule !== null && pkg.startsWith(currentModule + "/");
}

function isCompanyExternal(pkg: string, companyName: string | null): boolean {
  return companyName !== null && pkg.startsWith(`github.com/${companyName}/`);
}

function getCompanyName(currentModule: string | null): string | null {
  if (currentModule && currentModule.startsWith("github.com/")) {
    const parts = currentModule.split("/");
    return parts.length >= 2 ? parts[1] : null;
  }
  return null;
}

function getInternalGroupName(pkg: string, currentModule: string): string {
  const relativePath = pkg.substring(currentModule.length + 1);
  return relativePath.split("/")[0];
}

function buildImportBlock(groups: ImportGroup): string {
  const sortGroup = (group: string[]) => group.sort((a, b) => a.localeCompare(b));
  const allGroups: string[][] = [];

  // Add groups in order: stdlib, external, company external, internal
  if (groups.stdLib.length > 0) {
    allGroups.push(sortGroup(groups.stdLib));
  }
  
  if (groups.external.length > 0) {
    allGroups.push(sortGroup(groups.external));
  }
  
  if (groups.companyExternal.length > 0) {
    allGroups.push(sortGroup(groups.companyExternal));
  }

  // Add internal groups sorted by group name
  Object.keys(groups.internal)
    .sort()
    .forEach(groupName => {
      if (groups.internal[groupName].length > 0) {
        allGroups.push(sortGroup(groups.internal[groupName]));
      }
    });

  const importLines: string[] = [];
  allGroups.forEach((group, idx) => {
    if (idx > 0) {
      importLines.push(""); // Empty line between groups
    }
    group.forEach(imp => {
      importLines.push(`\t${imp}`);
    });
  });

  return `import (\n${importLines.join("\n")}\n)`;
}

function findGoModPath(startPath: string): string | null {
  let currentPath = path.dirname(startPath);
  const root = path.parse(currentPath).root;
  
  while (currentPath !== root) {
    const goModPath = path.join(currentPath, "go.mod");
    if (fs.existsSync(goModPath)) {
      return goModPath;
    }
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}

function getModuleName(goModPath: string): string | null {
  try {
    const content = fs.readFileSync(goModPath, 'utf8');
    
    // Find module declaration more efficiently
    const moduleMatch = content.match(/^module\s+(.+)$/m);
    if (moduleMatch) {
      return moduleMatch[1].trim();
    }
  } catch (error) {
    console.error('Error reading go.mod:', error);
  }
  
  return null;
}

export function deactivate() {}
