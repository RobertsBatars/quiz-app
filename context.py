import os

def read_file_content(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

def should_exclude(path):
    exclude_dirs = {'node_modules', '.next'}
    exclude_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.pdf', '.zip'}
    
    # Check if path contains excluded directories
    for excluded_dir in exclude_dirs:
        if excluded_dir in path.split(os.sep):
            return True
            
    # Check file extension
    _, ext = os.path.splitext(path)
    if ext.lower() in exclude_extensions:
        return True
        
    return False

def create_project_context(start_path='.'):
    with open('project_context.txt', 'w', encoding='utf-8') as output_file:
        for root, dirs, files in os.walk(start_path):
            # Skip excluded directories
            if should_exclude(root):
                continue
                
            for file in files:
                file_path = os.path.join(root, file)
                
                # Skip excluded files
                if should_exclude(file_path):
                    continue
                    
                # Write file path and separator
                output_file.write(f"\n{'='*80}\n")
                output_file.write(f"File: {file_path}\n")
                output_file.write(f"{'='*80}\n\n")
                
                # Write file content
                content = read_file_content(file_path)
                output_file.write(content)
                output_file.write('\n')

if __name__ == "__main__":
    create_project_context()
    print("Project context has been created in 'project_context.txt'")