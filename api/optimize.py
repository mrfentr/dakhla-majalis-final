#!/usr/bin/env python3
"""
Vercel Python API endpoint for OR-Tools optimization.
This runs directly on Vercel without subprocess spawning.
"""

import sys
import json
import os
from http.server import BaseHTTPRequestHandler

# Add python-optimizer to path
# Support both local development and Vercel deployment
current_dir = os.path.dirname(os.path.abspath(__file__))
cwd = os.getcwd()

# Debug: Print environment info
print(f'🐍 [API-PYTHON] __file__: {__file__}', file=sys.stderr)
print(f'🐍 [API-PYTHON] Current dir: {current_dir}', file=sys.stderr)
print(f'🐍 [API-PYTHON] Working dir: {cwd}', file=sys.stderr)

# Try multiple paths in order
paths_to_try = [
    os.path.join(current_dir, '..', 'python-optimizer'),  # ../python-optimizer from api/
    os.path.join(cwd, 'python-optimizer'),                 # ./python-optimizer from root
    '/var/task/python-optimizer',                          # Vercel/Lambda specific
]

optimizer_path = None
for path in paths_to_try:
    abs_path = os.path.abspath(path)
    print(f'🐍 [API-PYTHON] Trying: {abs_path}', file=sys.stderr)
    if os.path.exists(abs_path):
        optimizer_path = abs_path
        print(f'🐍 [API-PYTHON] ✅ Found optimizer at: {abs_path}', file=sys.stderr)
        break

if optimizer_path is None:
    # Error: couldn't find python-optimizer
    print(f'🐍 [API-PYTHON] ❌ ERROR: Cannot find python-optimizer directory!', file=sys.stderr)
    print(f'🐍 [API-PYTHON] Working directory contents:', file=sys.stderr)
    try:
        for item in os.listdir(cwd):
            print(f'🐍 [API-PYTHON]   - {item}', file=sys.stderr)
    except Exception as e:
        print(f'🐍 [API-PYTHON] Cannot list cwd: {e}', file=sys.stderr)

    # Use current_dir parent as fallback
    optimizer_path = os.path.join(current_dir, '..', 'python-optimizer')
    print(f'🐍 [API-PYTHON] Using fallback path: {optimizer_path}', file=sys.stderr)

sys.path.insert(0, optimizer_path)

# Import your existing optimizer functions (NO CHANGES to logic)
from single_wall_optimizer import hybrid_optimize_single_wall
from l_shape_optimizer_v2 import hybrid_optimize_l_shape
from u_shape_optimizer import optimize_u_shape
from four_wall_optimizer import optimize_four_walls


class handler(BaseHTTPRequestHandler):
    """
    Vercel serverless function handler.
    Receives HTTP POST requests and routes to appropriate optimizer.
    """
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            layout_type = data.get('layoutType')
            lengths = data.get('lengths', {})
            
            print(f'🔵 [API-PYTHON] Request: {layout_type}', file=sys.stderr)
            
            # Route to appropriate optimizer (call your existing Python functions)
            if layout_type == 'single-wall':
                result = self._optimize_single_wall(lengths)
            elif layout_type == 'l-shape':
                result = self._optimize_l_shape(lengths)
            elif layout_type == 'u-shape':
                result = self._optimize_u_shape(lengths)
            elif layout_type == 'four-walls':
                result = self._optimize_four_walls(lengths)
            else:
                self._send_error(400, f'Unknown layout type: {layout_type}')
                return
            
            # Send success response
            self._send_json(200, {'success': True, 'result': result})
            
        except Exception as e:
            print(f'❌ [API-PYTHON] Error: {e}', file=sys.stderr)
            self._send_error(500, str(e))
    
    def _optimize_single_wall(self, lengths):
        """Single wall optimization - calls your existing code"""
        wall_length = lengths.get('single', 0)
        
        if wall_length < 110 or wall_length > 2000:
            raise ValueError('Invalid wall length. Must be between 110cm and 2000cm.')
        
        print(f'🔵 [API-PYTHON] Optimizing single wall: {wall_length}cm', file=sys.stderr)
        
        # Call your existing Python function
        python_result = hybrid_optimize_single_wall(wall_length)
        
        if python_result.get('error'):
            raise Exception(f"Optimizer error: {python_result['error']} - {python_result.get('message', '')}")
        
        # Transform to match expected format
        total_glssa = len(python_result['glssaPieces'])
        total_wssada = len(python_result['wssadaPieces'])
        base_price = 4600
        price_per_piece = 2000
        estimated_price = base_price + ((total_glssa + total_wssada - 1) * price_per_piece)
        
        return {
            'totalGlssa': total_glssa,
            'totalWssada': total_wssada,
            'estimatedPrice': estimated_price,
            'glssaPieces': python_result['glssaPieces'],
            'wssadaPieces': python_result['wssadaPieces'],
            'engine': {
                'name': 'OR-Tools CP-SAT',
                'version': '2025-11-06-ortools-v1',
                'solutionTime': python_result.get('solutionTime'),
                'status': python_result.get('status'),
                'objectiveValue': python_result.get('objectiveValue')
            }
        }
    
    def _optimize_l_shape(self, lengths):
        """L-shape optimization - calls your existing code"""
        h_length = lengths.get('h', 0)
        v_length = lengths.get('v', 0)
        
        if h_length < 110 or h_length > 2000 or v_length < 110 or v_length > 2000:
            raise ValueError('Invalid wall lengths. Must be between 110cm and 2000cm.')
        
        print(f'🔵 [API-PYTHON] Optimizing L-shape: H={h_length}cm, V={v_length}cm', file=sys.stderr)
        
        # Call your existing Python function
        python_result = hybrid_optimize_l_shape(h_length, v_length)
        
        if python_result.get('error'):
            raise Exception(f"Optimizer error: {python_result['error']} - {python_result.get('message', '')}")
        
        # Transform to match expected format
        total_glssa = python_result['totalGlssa']
        total_wssada = python_result['totalWssada']
        base_price = 4600
        price_per_piece = 2000
        estimated_price = base_price + ((total_glssa + total_wssada - 1) * price_per_piece)
        
        return {
            'totalGlssa': total_glssa,
            'totalWssada': total_wssada,
            'estimatedPrice': estimated_price,
            'glssaPieces': [
                *python_result['horizontal']['glssaPieces'],
                *python_result['vertical']['glssaPieces']
            ],
            'wssadaPieces': [
                *python_result['horizontal']['wssadaPieces'],
                *python_result['vertical']['wssadaPieces']
            ],
            'owner': python_result['cornerOwner'],
            'wssadaOwner': python_result['wssadaOwner'],
            'horizontal': {
                'glssaPieces': python_result['horizontal']['glssaPieces'],
                'wssadaPieces': python_result['horizontal']['wssadaPieces'],
                'effectiveLength': python_result['horizontal']['glssaCoverage'],
                'voidSpace': python_result['horizontal']['glssaVoid'],
                'wssadaTarget': python_result['horizontal']['wssadaTarget'],
                'wssadaVoid': python_result['horizontal']['wssadaVoid']
            },
            'vertical': {
                'glssaPieces': python_result['vertical']['glssaPieces'],
                'wssadaPieces': python_result['vertical']['wssadaPieces'],
                'effectiveLength': python_result['vertical']['glssaCoverage'],
                'voidSpace': python_result['vertical']['glssaVoid'],
                'wssadaTarget': python_result['vertical']['wssadaTarget'],
                'wssadaVoid': python_result['vertical']['wssadaVoid']
            },
            'engine': {
                'name': 'OR-Tools CP-SAT',
                'version': '2025-11-06-ortools-v2-lshape-2step',
                'solutionTime': python_result.get('solutionTime'),
                'status': python_result.get('status')
            }
        }
    
    def _optimize_u_shape(self, lengths):
        """U-shape optimization - calls your existing code"""
        l_length = lengths.get('l', 0)
        h_length = lengths.get('h', 0)
        r_length = lengths.get('r', 0)
        
        if l_length < 110 or l_length > 2000 or h_length < 110 or h_length > 2000 or r_length < 110 or r_length > 2000:
            raise ValueError('Invalid wall lengths. Must be between 110cm and 2000cm.')
        
        print(f'🔵 [API-PYTHON] Optimizing U-shape: L={l_length}cm, H={h_length}cm, R={r_length}cm', file=sys.stderr)
        
        # Call your existing Python function
        python_result = optimize_u_shape(l_length, h_length, r_length)
        
        if python_result.get('error'):
            raise Exception(f"Optimizer error: {python_result['error']} - {python_result.get('message', '')}")
        
        # Transform to match expected format
        total_glssa = python_result['totalGlssa']
        total_wssada = python_result['totalWssada']
        base_price = 4600
        price_per_piece = 2000
        estimated_price = base_price + ((total_glssa + total_wssada - 1) * price_per_piece)
        
        return {
            'totalGlssa': total_glssa,
            'totalWssada': total_wssada,
            'estimatedPrice': estimated_price,
            'glssaPieces': [
                *python_result['left']['glssaPieces'],
                *python_result['horizontal']['glssaPieces'],
                *python_result['right']['glssaPieces']
            ],
            'wssadaPieces': [
                *python_result['left']['wssadaPieces'],
                *python_result['horizontal']['wssadaPieces'],
                *python_result['right']['wssadaPieces']
            ],
            'leftCornerOwner': python_result['leftCornerOwner'],
            'rightCornerOwner': python_result['rightCornerOwner'],
            'leftWssadaOwner': python_result['leftWssadaOwner'],
            'rightWssadaOwner': python_result['rightWssadaOwner'],
            'left': {
                'glssaPieces': python_result['left']['glssaPieces'],
                'wssadaPieces': python_result['left']['wssadaPieces'],
                'effectiveLength': python_result['left']['glssaCoverage'],
                'voidSpace': python_result['left']['glssaVoid'],
                'wssadaTarget': python_result['left']['wssadaTarget'],
                'wssadaVoid': python_result['left']['wssadaVoid']
            },
            'horizontal': {
                'glssaPieces': python_result['horizontal']['glssaPieces'],
                'wssadaPieces': python_result['horizontal']['wssadaPieces'],
                'effectiveLength': python_result['horizontal']['glssaCoverage'],
                'voidSpace': python_result['horizontal']['glssaVoid'],
                'wssadaTarget': python_result['horizontal']['wssadaTarget'],
                'wssadaVoid': python_result['horizontal']['wssadaVoid']
            },
            'right': {
                'glssaPieces': python_result['right']['glssaPieces'],
                'wssadaPieces': python_result['right']['wssadaPieces'],
                'effectiveLength': python_result['right']['glssaCoverage'],
                'voidSpace': python_result['right']['glssaVoid'],
                'wssadaTarget': python_result['right']['wssadaTarget'],
                'wssadaVoid': python_result['right']['wssadaVoid']
            },
            'svgLayout': python_result.get('svgLayout'),
            'engine': {
                'name': 'OR-Tools CP-SAT',
                'version': '2025-11-06-ortools-v4-ushape-svg-layout',
                'solutionTime': python_result.get('solutionTime'),
                'status': python_result.get('status')
            }
        }
    
    def _optimize_four_walls(self, lengths):
        """Four walls optimization - calls your existing code"""
        top_length = lengths.get('top', 0)
        left_length = lengths.get('left', 0)
        right_length = lengths.get('right', 0)
        bottom_length = lengths.get('bottom', 0)
        bottom_left_to_door = lengths.get('bottomLeftToDoor', 0)
        door_to_bottom_right = lengths.get('doorToBottomRight', 0)
        
        if (top_length < 110 or top_length > 2000 or
            left_length < 110 or left_length > 2000 or
            right_length < 110 or right_length > 2000 or
            bottom_length < 110 or bottom_length > 2000):
            raise ValueError('Invalid wall lengths. Must be between 110cm and 2000cm.')
        
        # Validate door position
        door_width = bottom_length - bottom_left_to_door - door_to_bottom_right
        if door_width <= 0 or bottom_left_to_door < 0 or door_to_bottom_right < 0:
            raise ValueError('Invalid door position. Please check your measurements.')
        
        print(f'🔵 [API-PYTHON] Optimizing 4-walls: T={top_length}cm, L={left_length}cm, R={right_length}cm, B={bottom_length}cm, Door={door_width}cm', file=sys.stderr)
        
        # Call your existing Python function
        python_result = optimize_four_walls(
            top_length, left_length, right_length, bottom_length,
            bottom_left_to_door, door_to_bottom_right
        )
        
        if python_result.get('error'):
            raise Exception(f"Optimizer error: {python_result['error']} - {python_result.get('message', '')}")
        
        # Transform to match expected format
        total_glssa = python_result['totalGlssa']
        total_wssada = python_result['totalWssada']
        base_price = 4600
        price_per_piece = 2000
        estimated_price = base_price + ((total_glssa + total_wssada - 1) * price_per_piece)
        
        return {
            'totalGlssa': total_glssa,
            'totalWssada': total_wssada,
            'estimatedPrice': estimated_price,
            'glssaPieces': [
                *python_result['top']['glssaPieces'],
                *python_result['left']['glssaPieces'],
                *python_result['right']['glssaPieces'],
                *python_result['bottomLeft']['glssaPieces'],
                *python_result['bottomRight']['glssaPieces']
            ],
            'wssadaPieces': [
                *python_result['top']['wssadaPieces'],
                *python_result['left']['wssadaPieces'],
                *python_result['right']['wssadaPieces'],
                *python_result['bottomLeft']['wssadaPieces'],
                *python_result['bottomRight']['wssadaPieces']
            ],
            'topLeftCornerOwner': python_result['topLeftCornerOwner'],
            'topRightCornerOwner': python_result['topRightCornerOwner'],
            'bottomLeftCornerOwner': python_result['bottomLeftCornerOwner'],
            'bottomRightCornerOwner': python_result['bottomRightCornerOwner'],
            'topLeftWssadaOwner': python_result['topLeftWssadaOwner'],
            'topRightWssadaOwner': python_result['topRightWssadaOwner'],
            'bottomLeftWssadaOwner': python_result['bottomLeftWssadaOwner'],
            'bottomRightWssadaOwner': python_result['bottomRightWssadaOwner'],
            'top': {
                'glssaPieces': python_result['top']['glssaPieces'],
                'wssadaPieces': python_result['top']['wssadaPieces'],
                'effectiveLength': python_result['top']['glssaCoverage'],
                'voidSpace': python_result['top']['glssaVoid'],
                'wssadaTarget': python_result['top']['wssadaTarget'],
                'wssadaVoid': python_result['top']['wssadaVoid']
            },
            'left': {
                'glssaPieces': python_result['left']['glssaPieces'],
                'wssadaPieces': python_result['left']['wssadaPieces'],
                'effectiveLength': python_result['left']['glssaCoverage'],
                'voidSpace': python_result['left']['glssaVoid'],
                'wssadaTarget': python_result['left']['wssadaTarget'],
                'wssadaVoid': python_result['left']['wssadaVoid']
            },
            'right': {
                'glssaPieces': python_result['right']['glssaPieces'],
                'wssadaPieces': python_result['right']['wssadaPieces'],
                'effectiveLength': python_result['right']['glssaCoverage'],
                'voidSpace': python_result['right']['glssaVoid'],
                'wssadaTarget': python_result['right']['wssadaTarget'],
                'wssadaVoid': python_result['right']['wssadaVoid']
            },
            'bottomLeft': {
                'glssaPieces': python_result['bottomLeft']['glssaPieces'],
                'wssadaPieces': python_result['bottomLeft']['wssadaPieces'],
                'effectiveLength': python_result['bottomLeft']['glssaCoverage'],
                'voidSpace': python_result['bottomLeft']['glssaVoid'],
                'wssadaTarget': python_result['bottomLeft']['wssadaTarget'],
                'wssadaVoid': python_result['bottomLeft']['wssadaVoid']
            },
            'bottomRight': {
                'glssaPieces': python_result['bottomRight']['glssaPieces'],
                'wssadaPieces': python_result['bottomRight']['wssadaPieces'],
                'effectiveLength': python_result['bottomRight']['glssaCoverage'],
                'voidSpace': python_result['bottomRight']['glssaVoid'],
                'wssadaTarget': python_result['bottomRight']['wssadaTarget'],
                'wssadaVoid': python_result['bottomRight']['wssadaVoid']
            },
            'svgLayout': python_result.get('svgLayout'),
            'engine': {
                'name': 'OR-Tools CP-SAT',
                'version': '2025-11-06-ortools-v5-fourwalls-svg-layout',
                'solutionTime': python_result.get('solutionTime'),
                'status': python_result.get('status')
            }
        }
    
    def _send_json(self, status_code, data):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def _send_error(self, status_code, message):
        """Send error response"""
        self._send_json(status_code, {'error': message})
