% Download GIT here: https://git-scm.com/install/windows?utm_source=chatgpt.com
% Check for installation in Matlab terminal: system("git --version")


clear all;
repoFolder = "C:\Users\nstat\Documents\GitHub\waveglider-dashboard";

file = 'G:\Shared drives\AirSeaLab_Shared\SLAM_2026\PAYLOAD\MAT\CARSON_PLD_DATA_ALL.mat';
deployment = 'SLAM_2026';
vehicle = 'CARSON';
WG_JSON(file,deployment,vehicle,repoFolder)

file = 'G:\Shared drives\AirSeaLab_Shared\SNIPEE_2025\PAYLOAD\MAT\CARSON_PLD_DATA_ALL.mat';
deployment = 'SNIPEE_2025';
vehicle = 'CARSON';
WG_JSON(file,deployment,vehicle,repoFolder)

file = 'G:\Shared drives\AirSeaLab_Shared\SNIPEE_2025\PAYLOAD\MAT\STOKES_PLD_DATA_ALL.mat';
deployment = 'SNIPEE_2025';
vehicle = 'STOKES';
WG_JSON(file,deployment,vehicle,repoFolder)

file = 'G:\Shared drives\AirSeaLab_Shared\Southern Ocean\Wave Glider\PAYLOAD\MAT\IDA_PLD_DATA_ALL.mat';
deployment = 'Southern_Ocean';
vehicle = 'IDA';
WG_JSON(file,deployment,vehicle,repoFolder)

file = 'G:\Shared drives\AirSeaLab_Shared\ASTRAL_2025\PAYLOAD\MAT\IDA_PLD_DATA_ALL.mat';
deployment = 'ASTRAL_2025';
vehicle = 'IDA';
WG_JSON(file,deployment,vehicle,repoFolder)

file = 'G:\Shared drives\AirSeaLab_Shared\ASTRAL_2025\PAYLOAD\MAT\PASCAL_PLD_DATA_ALL.mat';
deployment = 'ASTRAL_2025';
vehicle = 'PASCAL';
WG_JSON(file,deployment,vehicle,repoFolder)

file = 'G:\Shared drives\AirSeaLab_Shared\ASTRAL_2025\PAYLOAD\MAT\PLANCK_PLD_DATA_ALL.mat';
deployment = 'ASTRAL_2025';
vehicle = 'PLANCK';
WG_JSON(file,deployment,vehicle,repoFolder)

file = 'G:\Shared drives\AirSeaLab_Shared\ASTRAL_2025\PAYLOAD\MAT\WHOI43_PLD_DATA_ALL.mat';
deployment = 'ASTRAL_2025';
vehicle = 'WHOI43';
WG_JSON(file,deployment,vehicle,repoFolder)

file = 'G:\Shared drives\AirSeaLab_Shared\ASTRAL_2025\PAYLOAD\MAT\WHOI1102_PLD_DATA_ALL.mat';
deployment = 'ASTRAL_2025';
vehicle = 'WHOI1102';
WG_JSON(file,deployment,vehicle,repoFolder)


%% Create dashboard index.json

dataFolder = fullfile(repoFolder, "data");

jsonFiles = dir(fullfile(dataFolder, "*_Dashboard.json"));

fileNames = {jsonFiles.name};

index = struct();
index.files = fileNames;

indexFile = fullfile(dataFolder, "index.json");

jsonText = jsonencode(index);

fid = fopen(indexFile, "w");

if fid == -1
    error("Could not open index.json for writing.");
end

fprintf(fid, "%s", jsonText);

fclose(fid);

fprintf("\nCreated dashboard index:\n");
fprintf("  %s\n", indexFile);

fprintf("\nFiles included:\n");

for i = 1:numel(fileNames)
    fprintf("  %s\n", fileNames{i});
end
