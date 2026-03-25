#!/usr/bin/env python3
"""
Simple execution of validate_coords.py - outputs directly to console
"""

if __name__ == '__main__':
    import sys
    import os
    
    # Change directory
    os.chdir(r'C:\Users\vc_ch\Documents\GitHub\Climb-Performance-Lab')
    
    # Read and execute validate_coords.py
    with open('validate_coords.py', 'r', encoding='utf-8') as f:
        code_str = f.read()
    
    # Create a namespace for execution
    namespace = {'__name__': '__main__', '__file__': 'validate_coords.py'}
    
    # Execute the code
    exec(code_str, namespace)
