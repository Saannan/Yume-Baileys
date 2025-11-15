#!/usr/bin/env node

/**
 * Engine Requirements Checker for @ajammm/baileys
 * Ensures the correct Node.js version is installed
 */

const { engines } = require('./package.json');
const currentVersion = process.versions.node;
const requiredVersion = engines.node;

/**
 * Parse version string (e.g., ">=20.0.0")
 */
function parseVersionRequirement(requirement) {
    const match = requirement.match(/([><=]+)\s*(\d+\.\d+\.\d+)/);
    if (!match) {
        return { operator: '>=', version: '20.0.0' };
    }
    return {
        operator: match[1],
        version: match[2]
    };
}

/**
 * Compare two version strings
 */
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
}

/**
 * Check if current version meets requirement
 */
function checkVersion(current, requirement) {
    const { operator, version } = parseVersionRequirement(requirement);
    const comparison = compareVersions(current, version);
    
    switch (operator) {
        case '>=':
            return comparison >= 0;
        case '>':
            return comparison > 0;
        case '<=':
            return comparison <= 0;
        case '<':
            return comparison < 0;
        case '=':
        case '==':
            return comparison === 0;
        default:
            return true;
    }
}

// Main check
const isVersionValid = checkVersion(currentVersion, requiredVersion);

if (!isVersionValid) {
    console.error('\n❌ ERROR: Incompatible Node.js version detected!\n');
    console.error(`   Required: Node.js ${requiredVersion}`);
    console.error(`   Current:  Node.js ${currentVersion}\n`);
    console.error('   Please upgrade your Node.js version to continue.');
    console.error('   Download from: https://nodejs.org/\n');
    process.exit(1);
}

// Success - silent mode (don't spam console)
// console.log('✅ Node.js version check passed');
process.exit(0);
