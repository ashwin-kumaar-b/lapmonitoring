; Inno Setup Script for DeviceGuardian AI Monitoring Agent
; To compile: Download Inno Setup (jrsoftware.org) and open this file.

[Setup]
AppName=DeviceGuardian AI Agent
AppVersion=1.0.0
DefaultDirName={pf}\DeviceGuardian AI
DefaultGroupName=DeviceGuardian AI
OutputDir=Output
OutputBaseFilename=DeviceGuardianSetup
Compression=lzma2
SolidCompression=yes
SetupIconFile=
PrivilegesRequired=admin
CloseApplications=yes

[Files]
Source: "..\dist\DeviceGuardianAgent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\config.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\.env.example"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\DeviceGuardian AI Agent"; Filename: "{app}\DeviceGuardianAgent.exe"
Name: "{commondesktop}\DeviceGuardian AI Agent"; Filename: "{app}\DeviceGuardianAgent.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Run]
Filename: "{app}\DeviceGuardianAgent.exe"; Description: "Launch DeviceGuardian AI Agent now"; Flags: nowait postinstall skipifsilent

[Code]
var
  ConfigPage: TWizardPage;
  ApiUrlEdit: TNewEdit;
  EmailEdit: TNewEdit;
  PasswordEdit: TNewEdit;

procedure InitializeWizard;
var
  ApiUrlLabel, EmailLabel, PasswordLabel: TLabel;
begin
  // Create custom configurations page after the target directory selection
  ConfigPage := CreateCustomPage(wpSelectDir, 'DeviceGuardian AI Settings', 'Enter your FastAPI Backend URL and authentication credentials.');

  // Backend API URL Field
  ApiUrlLabel := TLabel.Create(ConfigPage);
  ApiUrlLabel.Caption := 'FastAPI Backend URL:';
  ApiUrlLabel.Parent := ConfigPage.Surface;
  ApiUrlLabel.Top := 10;
  ApiUrlLabel.Left := 10;
  
  ApiUrlEdit := TNewEdit.Create(ConfigPage);
  ApiUrlEdit.Text := 'http://localhost:8000';
  ApiUrlEdit.Parent := ConfigPage.Surface;
  ApiUrlEdit.Top := 30;
  ApiUrlEdit.Left := 10;
  ApiUrlEdit.Width := 350;

  // Agent Email Field
  EmailLabel := TLabel.Create(ConfigPage);
  EmailLabel.Caption := 'Agent Registration Email:';
  EmailLabel.Parent := ConfigPage.Surface;
  EmailLabel.Top := 70;
  EmailLabel.Left := 10;
  
  EmailEdit := TNewEdit.Create(ConfigPage);
  EmailEdit.Text := 'agent@deviceguardian.ai';
  EmailEdit.Parent := ConfigPage.Surface;
  EmailEdit.Top := 90;
  EmailEdit.Left := 10;
  EmailEdit.Width := 350;

  // Agent Password Field
  PasswordLabel := TLabel.Create(ConfigPage);
  PasswordLabel.Caption := 'Agent Authentication Password:';
  PasswordLabel.Parent := ConfigPage.Surface;
  PasswordLabel.Top := 130;
  PasswordLabel.Left := 10;
  
  PasswordEdit := TNewEdit.Create(ConfigPage);
  PasswordEdit.Text := '';
  PasswordEdit.PasswordChar := '*';
  PasswordEdit.Parent := ConfigPage.Surface;
  PasswordEdit.Top := 150;
  PasswordEdit.Left := 10;
  PasswordEdit.Width := 350;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvFilePath: String;
  Lines: TArrayOfString;
begin
  if CurStep = ssPostInstall then begin
    EnvFilePath := ExpandConstant('{app}\.env');
    
    // Set up env file structure based on user wizard inputs
    SetArrayLength(Lines, 5);
    Lines[0] := '# FastAPI Backend Configuration';
    Lines[1] := 'API_URL=' + ApiUrlEdit.Text;
    Lines[2] := '';
    Lines[3] := 'AGENT_EMAIL=' + EmailEdit.Text;
    Lines[4] := 'AGENT_PASSWORD=' + PasswordEdit.Text;
    
    // Save generated string arrays directly to .env
    if SaveStringsToFile(EnvFilePath, Lines, False) then begin
      Log('Successfully generated .env config file.');
    end else begin
      MsgBox('Failed to write .env file. Please configure it manually in the directory.', mbError, MB_OK);
    end;
  end;
end;
