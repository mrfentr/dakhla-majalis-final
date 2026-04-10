"use node";

/**
 * OR-Tools Optimization Logic
 *
 * This module integrates Google OR-Tools CP-SAT solver for tadelakt piece optimization.
 * It runs Python optimizers via subprocess and transforms results to match the current format.
 *
 * IMPORTANT: This runs ALONGSIDE optimizationLogic.ts (not replacing it).
 * Feature flag determines which optimizer to use.
 */

import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Run Python OR-Tools optimizer via subprocess
 *
 * @param scriptName - Python script filename (e.g., 'single_wall_optimizer.py')
 * @param input - Input data to send to Python via stdin (JSON)
 * @param timeout - Maximum execution time in milliseconds (default: 3000)
 * @returns Promise resolving to optimizer output (JSON)
 */
async function runPythonOptimizer(
  scriptName: string,
  input: any,
  timeout: number = 3000
): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`🐍 [PYTHON-OPTIMIZER] Starting ${scriptName}`, input);

    // Python executable path (can be overridden via env var)
    const pythonPath = process.env.PYTHON_PATH || 'python3';

    // Script path (relative to project root)
    const scriptPath = path.join(process.cwd(), 'python-optimizer', scriptName);

    console.log(`🐍 [PYTHON-OPTIMIZER] Python: ${pythonPath}`);
    console.log(`🐍 [PYTHON-OPTIMIZER] Script: ${scriptPath}`);

    // Spawn Python process
    const python = spawn(pythonPath, [scriptPath]);

    let stdout = '';
    let stderr = '';

    // Collect stdout (JSON result)
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr (debug logs)
    python.stderr.on('data', (data) => {
      const line = data.toString();
      stderr += line;
      // Log Python debug output
      if (line.includes('[OPTIMIZER]')) {
        console.log(`🐍 ${line.trim()}`);
      }
    });

    // Handle process completion
    python.on('close', (code) => {
      console.log(`🐍 [PYTHON-OPTIMIZER] Process exited with code ${code}`);

      if (code === 0) {
        try {
          // Parse JSON output
          const result = JSON.parse(stdout);
          console.log(`🐍 [PYTHON-OPTIMIZER] Success!`, result);
          resolve(result);
        } catch (e) {
          console.error(`🐍 [PYTHON-OPTIMIZER] Failed to parse output:`, stdout);
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      } else {
        console.error(`🐍 [PYTHON-OPTIMIZER] Error (code ${code}):`, stderr);
        reject(new Error(`Python process failed (code ${code}): ${stderr}`));
      }
    });

    // Handle process errors
    python.on('error', (err) => {
      console.error(`🐍 [PYTHON-OPTIMIZER] Spawn error:`, err);
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });

    // Send input via stdin
    python.stdin.write(JSON.stringify(input));
    python.stdin.end();

    // Timeout handler
    const timeoutId = setTimeout(() => {
      console.error(`🐍 [PYTHON-OPTIMIZER] Timeout after ${timeout}ms`);
      python.kill('SIGTERM');
      reject(new Error(`Python optimizer timeout after ${timeout}ms`));
    }, timeout);

    // Clear timeout on completion
    python.on('close', () => clearTimeout(timeoutId));
  });
}

/**
 * Build result object in the same format as current optimizationLogic.ts
 */
function buildResult(glssaPieces: number[], wssadaPieces: number[]) {
  const totalGlssa = glssaPieces.length;
  const totalWssada = wssadaPieces.length;
  const basePrice = 4600;
  const pricePerPiece = 2000;
  const estimatedPrice = basePrice + ((totalGlssa + totalWssada - 1) * pricePerPiece);

  return {
    totalGlssa,
    totalWssada,
    estimatedPrice,
    glssaPieces,
    wssadaPieces,
  };
}

/**
 * Compute optimization using OR-Tools (main entry point)
 *
 * This function has the SAME signature as computeOptimization() in optimizationLogic.ts
 * so they can be swapped via feature flag.
 *
 * @param args - Layout type and dimensions
 * @returns Optimization result in same format as current system
 */
export async function computeOptimizationORTools(args: {
  layoutType: "single-wall" | "l-shape" | "u-shape";
  lengths: {
    single?: number;
    h?: number;
    v?: number;
    l?: number;
    r?: number;
  };
}) {
  console.log('🔵 [OR-TOOLS] computeOptimizationORTools STARTED', args);

  try {
    // SINGLE WALL
    if (args.layoutType === 'single-wall') {
      const wallLength = args.lengths.single || 0;

      console.log(`🔵 [OR-TOOLS] Optimizing single wall: ${wallLength}cm`);

      // Call Python optimizer
      const result = await runPythonOptimizer(
        'single_wall_optimizer.py',
        { wallLength },
        2000 // 2 second timeout
      );

      // Check for errors
      if (result.error) {
        throw new Error(`Optimizer error: ${result.error} - ${result.message || ''}`);
      }

      // Transform to match current format
      const transformed = {
        ...buildResult(result.glssaPieces, result.wssadaPieces),
        engine: {
          name: 'OR-Tools CP-SAT',
          version: '2025-11-06-ortools-v1',
          solutionTime: result.solutionTime,
          status: result.status,
          objectiveValue: result.objectiveValue
        },
        segments: {
          single: {
            glssaPieces: result.glssaPieces,
            wssadaPieces: result.wssadaPieces,
            voidSpace: result.glssaVoid,
            wssadaVoid: result.wssadaVoid,
            glssaCoverage: result.glssaCoverage,
            wssadaCoverage: result.wssadaCoverage
          }
        }
      };

      console.log('✅ [OR-TOOLS] Single wall optimization complete', transformed);
      return transformed;
    }

    // L-SHAPE
    if (args.layoutType === 'l-shape') {
      console.log('🔵 [OR-TOOLS] L-shape optimization not yet implemented');
      throw new Error('L-shape OR-Tools optimization coming in Phase 2');
    }

    // U-SHAPE
    if (args.layoutType === 'u-shape') {
      console.log('🔵 [OR-TOOLS] U-shape optimization not yet implemented');
      throw new Error('U-shape OR-Tools optimization coming in Phase 3');
    }

    throw new Error(`Unknown layout type: ${args.layoutType}`);

  } catch (error) {
    console.error('❌ [OR-TOOLS] Optimization failed:', error);

    // Re-throw with context
    if (error instanceof Error) {
      throw new Error(`OR-Tools optimization failed: ${error.message}`);
    }
    throw error;
  }
}
