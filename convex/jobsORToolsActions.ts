"use node";

/**
 * OR-Tools Actions
 *
 * This file contains actions that run Python optimizer directly in Node.js runtime.
 * Uses "use node" directive to access child_process.spawn for Python execution.
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateSingleWallSVG, generateLShapeSVG, generateUShapeSVG } from "./svgGeneration";
import { spawn } from "child_process";

/**
 * Run Python optimizer directly in Convex Action
 * This avoids the "forbidden localhost" issue
 */
async function runPythonOptimizer(
  scriptName: string,
  input: any,
  timeout: number = 30000
): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log(`🐍 [CONVEX-PYTHON] Starting ${scriptName}`, input);

    const pythonPath = process.env.PYTHON_PATH || 'python3';
    // Convex Actions run from the project root
    const scriptPath = `./python-optimizer/${scriptName}`;

    console.log(`🐍 [CONVEX-PYTHON] Python: ${pythonPath}`);
    console.log(`🐍 [CONVEX-PYTHON] Script: ${scriptPath}`);

    const python = spawn(pythonPath, [scriptPath]);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      const line = data.toString();
      stderr += line;
      if (line.includes('[OPTIMIZER]')) {
        console.log(`🐍 ${line.trim()}`);
      }
    });

    python.on('close', (code) => {
      console.log(`🐍 [CONVEX-PYTHON] Process exited with code ${code}`);
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          console.log(`🐍 [CONVEX-PYTHON] Success!`);
          resolve(result);
        } catch (e) {
          console.error(`🐍 [CONVEX-PYTHON] Failed to parse output:`, stdout);
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      } else {
        console.error(`🐍 [CONVEX-PYTHON] Error (code ${code}):`, stderr);
        reject(new Error(`Python process failed: ${stderr}`));
      }
    });

    python.on('error', (err) => {
      console.error(`🐍 [CONVEX-PYTHON] Spawn error:`, err);
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });

    python.stdin.write(JSON.stringify(input));
    python.stdin.end();

    const timeoutId = setTimeout(() => {
      console.error(`🐍 [CONVEX-PYTHON] Timeout after ${timeout}ms`);
      python.kill('SIGTERM');
      reject(new Error(`Python optimizer timeout after ${timeout}ms`));
    }, timeout);

    python.on('close', () => clearTimeout(timeoutId));
  });
}

/**
 * INTERNAL ACTION: Execute OR-Tools optimization
 * This runs as a scheduled function with its own memory/time limits
 */
export const executeOptimizationORTools = internalAction({
  args: {
    jobId: v.id("optimizationJobsORTools"),
  },
  handler: async (ctx, args) => {
    console.log('🟦 [CONVEX-ORTOOLS-ACTION] executeOptimizationORTools STARTED for job:', args.jobId);

    try {
      // Mark job as processing
      console.log('🟡 [CONVEX-ORTOOLS-ACTION] Updating job status to processing...');
      await ctx.runMutation(internal.jobsORTools.updateJobStatus, {
        jobId: args.jobId,
        status: "processing",
      });
      console.log('✅ [CONVEX-ORTOOLS-ACTION] Job status updated to processing');

      // Get the job details
      console.log('📥 [CONVEX-ORTOOLS-ACTION] Fetching job details...');
      const job = await ctx.runQuery(internal.jobsORTools.getJobById, {
        jobId: args.jobId,
      });
      console.log('✅ [CONVEX-ORTOOLS-ACTION] Job details fetched:', job);

      if (!job) {
        console.log('❌ [CONVEX-ORTOOLS-ACTION] Job not found!');
        throw new Error("Job not found");
      }

      // Run Python optimizer directly
      console.log('🔄 [CONVEX-ORTOOLS-ACTION] Starting OR-Tools optimization via Python...');

      let pythonResult: any;
      let result: any;

      // SINGLE WALL
      if (job.layoutType === 'single-wall') {
        pythonResult = await runPythonOptimizer(
          'single_wall_optimizer.py',
          { wallLength: job.lengths.single },
          5000
        );

        if (pythonResult.error) {
          throw new Error(`Optimizer error: ${pythonResult.error}`);
        }

        result = {
          totalGlssa: pythonResult.glssaPieces.length,
          totalWssada: pythonResult.wssadaPieces.length,
          glssaPieces: pythonResult.glssaPieces,
          wssadaPieces: pythonResult.wssadaPieces,
          engine: {
            name: 'OR-Tools CP-SAT',
            version: '2025-11-06-ortools-v1',
            solutionTime: pythonResult.solutionTime,
            status: pythonResult.status
          }
        };
      }
      // L-SHAPE
      else if (job.layoutType === 'l-shape') {
        pythonResult = await runPythonOptimizer(
          'l_shape_optimizer_v2.py',
          { hLength: job.lengths.h, vLength: job.lengths.v },
          180000 // 3 minutes
        );

        if (pythonResult.error) {
          throw new Error(`Optimizer error: ${pythonResult.error}`);
        }

        result = {
          totalGlssa: pythonResult.totalGlssa,
          totalWssada: pythonResult.totalWssada,
          owner: pythonResult.cornerOwner,
          wssadaOwner: pythonResult.wssadaOwner,
          horizontal: {
            glssaPieces: pythonResult.horizontal.glssaPieces,
            wssadaPieces: pythonResult.horizontal.wssadaPieces
          },
          vertical: {
            glssaPieces: pythonResult.vertical.glssaPieces,
            wssadaPieces: pythonResult.vertical.wssadaPieces
          },
          engine: {
            name: 'OR-Tools CP-SAT',
            version: '2025-11-06-ortools-v2-lshape-2step',
            solutionTime: pythonResult.solutionTime,
            status: pythonResult.status
          }
        };
      }
      // U-SHAPE
      else if (job.layoutType === 'u-shape') {
        pythonResult = await runPythonOptimizer(
          'u_shape_optimizer.py',
          { lLength: job.lengths.l, hLength: job.lengths.h, rLength: job.lengths.r },
          360000 // 6 minutes
        );

        if (pythonResult.error) {
          throw new Error(`Optimizer error: ${pythonResult.error}`);
        }

        result = {
          totalGlssa: pythonResult.totalGlssa,
          totalWssada: pythonResult.totalWssada,
          leftCornerOwner: pythonResult.leftCornerOwner,
          rightCornerOwner: pythonResult.rightCornerOwner,
          leftWssadaOwner: pythonResult.leftWssadaOwner,
          rightWssadaOwner: pythonResult.rightWssadaOwner,
          left: {
            glssaPieces: pythonResult.left.glssaPieces,
            wssadaPieces: pythonResult.left.wssadaPieces
          },
          horizontal: {
            glssaPieces: pythonResult.horizontal.glssaPieces,
            wssadaPieces: pythonResult.horizontal.wssadaPieces
          },
          right: {
            glssaPieces: pythonResult.right.glssaPieces,
            wssadaPieces: pythonResult.right.wssadaPieces
          },
          svgLayout: pythonResult.svgLayout,
          engine: {
            name: 'OR-Tools CP-SAT',
            version: '2025-11-06-ortools-v4-ushape-svg-layout',
            solutionTime: pythonResult.solutionTime,
            status: pythonResult.status
          }
        };
      }
      // FOUR-WALLS
      else if (job.layoutType === 'four-walls') {
        pythonResult = await runPythonOptimizer(
          'four_wall_optimizer.py',
          {
            topLength: job.lengths.top,
            leftLength: job.lengths.left,
            rightLength: job.lengths.right,
            bottomLength: job.lengths.bottom,
            bottomLeftToDoor: job.lengths.bottomLeftToDoor,
            doorToBottomRight: job.lengths.doorToBottomRight
          },
          600000 // 10 minutes
        );

        if (pythonResult.error) {
          throw new Error(`Optimizer error: ${pythonResult.error}`);
        }

        result = {
          totalGlssa: pythonResult.totalGlssa,
          totalWssada: pythonResult.totalWssada,
          topLeftCornerOwner: pythonResult.topLeftCornerOwner,
          topRightCornerOwner: pythonResult.topRightCornerOwner,
          bottomLeftCornerOwner: pythonResult.bottomLeftCornerOwner,
          bottomRightCornerOwner: pythonResult.bottomRightCornerOwner,
          topLeftWssadaOwner: pythonResult.topLeftWssadaOwner,
          topRightWssadaOwner: pythonResult.topRightWssadaOwner,
          bottomLeftWssadaOwner: pythonResult.bottomLeftWssadaOwner,
          bottomRightWssadaOwner: pythonResult.bottomRightWssadaOwner,
          top: {
            glssaPieces: pythonResult.top.glssaPieces,
            wssadaPieces: pythonResult.top.wssadaPieces
          },
          left: {
            glssaPieces: pythonResult.left.glssaPieces,
            wssadaPieces: pythonResult.left.wssadaPieces
          },
          right: {
            glssaPieces: pythonResult.right.glssaPieces,
            wssadaPieces: pythonResult.right.wssadaPieces
          },
          bottomLeft: {
            glssaPieces: pythonResult.bottomLeft.glssaPieces,
            wssadaPieces: pythonResult.bottomLeft.wssadaPieces
          },
          bottomRight: {
            glssaPieces: pythonResult.bottomRight.glssaPieces,
            wssadaPieces: pythonResult.bottomRight.wssadaPieces
          },
          svgLayout: pythonResult.svgLayout,
          engine: {
            name: 'OR-Tools CP-SAT',
            version: '2025-11-06-ortools-v5-fourwalls-svg-layout',
            solutionTime: pythonResult.solutionTime,
            status: pythonResult.status
          }
        };
      } else {
        throw new Error(`Unknown layout type: ${job.layoutType}`);
      }

      console.log('✅ [CONVEX-ORTOOLS-ACTION] Computation complete, result:', result);

      // Generate SVG
      let svgString: string | null = null;

      if (job.layoutType === 'single-wall' && result.glssaPieces && job.lengths.single) {
        console.log('🎨 [CONVEX-ORTOOLS-ACTION] Generating SVG for single wall...');
        svgString = generateSingleWallSVG({
          wallLength: job.lengths.single,
          glssaPieces: result.glssaPieces,
          wssadaPieces: result.wssadaPieces || [],
        });
        console.log('✅ [CONVEX-ORTOOLS-ACTION] SVG generated');
      }

      // L-SHAPE SVG GENERATION (Phase 2)
      if (job.layoutType === 'l-shape' && result.horizontal && result.vertical && job.lengths.h && job.lengths.v) {
        console.log('🎨 [CONVEX-ORTOOLS-ACTION] Generating SVG for L-shape...');
        console.log('🎨 [CONVEX-ORTOOLS-ACTION] Wssada Owner:', result.wssadaOwner);
        svgString = generateLShapeSVG({
          hLength: job.lengths.h,
          vLength: job.lengths.v,
          hGlssaPieces: result.horizontal.glssaPieces || [],
          hWssadaPieces: result.horizontal.wssadaPieces || [],
          vGlssaPieces: result.vertical.glssaPieces || [],
          vWssadaPieces: result.vertical.wssadaPieces || [],
          wssadaOwner: result.wssadaOwner, // Use detected Wssada corner owner
          owner: result.owner, // Glssa corner owner
        });
        console.log('✅ [CONVEX-ORTOOLS-ACTION] L-shape SVG generated');
      }

      // U-SHAPE SVG GENERATION (Phase 3)
      if (job.layoutType === 'u-shape' && result.left && result.horizontal && result.right && job.lengths.l && job.lengths.h && job.lengths.r) {
        console.log('🎨 [CONVEX-ORTOOLS-ACTION] Generating SVG for U-shape...');
        console.log('🎨 [CONVEX-ORTOOLS-ACTION] Left Wssada Owner:', result.leftWssadaOwner);
        console.log('🎨 [CONVEX-ORTOOLS-ACTION] Right Wssada Owner:', result.rightWssadaOwner);

        // Map owner values to SVG expected format
        // Left corner: "L" -> "left", "H" -> "back"
        const wssadaOwnerLeft = result.leftWssadaOwner === "L" ? "left" : "back";
        // Right corner: "H" -> "back", "R" -> "right"
        const wssadaOwnerRight = result.rightWssadaOwner === "R" ? "right" : "back";

        svgString = generateUShapeSVG({
          lLength: job.lengths.l,
          hLength: job.lengths.h,
          rLength: job.lengths.r,
          lGlssaPieces: result.left.glssaPieces || [],
          lWssadaPieces: result.left.wssadaPieces || [],
          hGlssaPieces: result.horizontal.glssaPieces || [],
          hWssadaPieces: result.horizontal.wssadaPieces || [],
          rGlssaPieces: result.right.glssaPieces || [],
          rWssadaPieces: result.right.wssadaPieces || [],
          wssadaOwnerLeft, // Map to 'left' | 'back'
          wssadaOwnerRight, // Map to 'right' | 'back'
        });
        console.log('✅ [CONVEX-ORTOOLS-ACTION] U-shape SVG generated');
      }

      // Store the successful result with SVG
      console.log('💾 [CONVEX-ORTOOLS-ACTION] Storing result and marking as completed...');
      await ctx.runMutation(internal.jobsORTools.completeJob, {
        jobId: args.jobId,
        result: {
          ...result,
          svgString,
        },
      });
      console.log('🏁 [CONVEX-ORTOOLS-ACTION] Job completed successfully!');

    } catch (error) {
      console.error('❌ [CONVEX-ORTOOLS-ACTION] Error occurred:', error);

      // Store the error
      await ctx.runMutation(internal.jobsORTools.failJob, {
        jobId: args.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log('💥 [CONVEX-ORTOOLS-ACTION] Job marked as failed');
    }
  },
});
