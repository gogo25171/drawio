/**
 * Plugin de génération de code bidirectionnel pour Draw.io
 * Génère du code depuis des diagrammes UML et vice-versa
 * Supporte Java, Python, TypeScript
 */

// Charger le plugin via Draw.loadPlugin
Draw.loadPlugin(function(ui) {
    console.log('Code Generator Plugin: Loading...');
    
    // Variables globales pour le plugin
    var codePanel = null;
    var currentLanguage = 'java';
    var isCodePanelVisible = false;
    
    // Charger les dépendances en utilisant eval pour simuler l'import des fichiers
    // En production, ces fichiers seraient chargés séparément
    
    // ============================================================================
    // INCLUDE: uml-analyzer.js
    // ============================================================================
    
    /**
     * Analyseur UML - Extrait les classes et relations d'un diagramme
     */
    function UMLAnalyzer() {
        this.analyzeCurrentDiagram = function(ui) {
            var graph = ui.editor.graph;
            var model = graph.getModel();
            var classes = [];
            var relationships = [];
            
            // Parcourir toutes les cellules du modèle
            var cells = model.getDescendants(model.root);
            
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                
                if (cell.isVertex() && cell.style) {
                    // Détecter les classes UML (style swimlane)
                    if (cell.style && (cell.style.indexOf('swimlane') !== -1 || 
                                      cell.style.indexOf('umlClass') !== -1)) {
                        var cellValue = cell.value ? cell.value.toString() : '';
                        var lines = cellValue.split('\n');
                        var className = lines[0].replace(/[«»]/g, '').trim();
                        
                        // Ignorer les stéréotypes
                        if (className.indexOf('interface') === -1 && 
                            className.indexOf('enum') === -1 && 
                            className.indexOf('abstract') === -1) {
                            
                            var classInfo = {
                                name: className || 'UnnamedClass',
                                attributes: [],
                                methods: [],
                                x: cell.geometry ? cell.geometry.x : 0,
                                y: cell.geometry ? cell.geometry.y : 0
                            };
                            
                            // Extraire attributs et méthodes des enfants
                            if (cell.children && cell.children.length > 0) {
                                for (var j = 0; j < cell.children.length; j++) {
                                    var child = cell.children[j];
                                    if (child.value && child.style && child.style.indexOf('line') === -1) {
                                        var value = child.value.toString().trim();
                                        
                                        if (value && value.length > 0) {
                                            if (value.indexOf('(') !== -1) {
                                                // Méthode
                                                var methodName = value.substring(value.indexOf(' ') + 1, value.indexOf('(')).trim();
                                                if (methodName) {
                                                    classInfo.methods.push({
                                                        name: methodName,
                                                        visibility: this.extractVisibility(value)
                                                    });
                                                }
                                            } else if (value.indexOf(':') !== -1) {
                                                // Attribut avec type
                                                var parts = value.split(':');
                                                var attrName = parts[0].trim().substring(1).trim(); // Enlever le symbole de visibilité
                                                var attrType = parts[1].trim();
                                                
                                                classInfo.attributes.push({
                                                    name: attrName,
                                                    type: attrType,
                                                    visibility: this.extractVisibility(parts[0])
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                            
                            classes.push(classInfo);
                        }
                    }
                }
                
                // Détecter les relations (flèches)
                if (cell.isEdge() && cell.source && cell.target) {
                    var sourceClass = this.findClassByCell(cell.source, classes);
                    var targetClass = this.findClassByCell(cell.target, classes);
                    
                    if (sourceClass && targetClass) {
                        relationships.push({
                            from: sourceClass.name,
                            to: targetClass.name,
                            type: this.getRelationshipType(cell.style)
                        });
                    }
                }
            }
            
            return {
                classes: classes,
                relationships: relationships
            };
        };
        
        this.findClassByCell = function(cell, classes) {
            if (!cell || !cell.value) return null;
            var cellValue = cell.value.toString();
            var lines = cellValue.split('\n');
            var cellName = lines[0].replace(/[«»]/g, '').trim();
            
            for (var i = 0; i < classes.length; i++) {
                if (classes[i].name === cellName) {
                    return classes[i];
                }
            }
            return null;
        };
        
        this.getRelationshipType = function(style) {
            if (!style) return 'association';
            if (style.indexOf('dashed') !== -1) return 'dependency';
            if (style.indexOf('endArrow=block') !== -1) return 'inheritance';
            if (style.indexOf('diamond') !== -1) return 'aggregation';
            return 'association';
        };
        
        this.extractVisibility = function(text) {
            if (text.indexOf('+') !== -1) return 'public';
            if (text.indexOf('-') !== -1) return 'private';
            if (text.indexOf('#') !== -1) return 'protected';
            return 'public';
        };
    }
    
    // ============================================================================
    // INCLUDE: code-generators.js
    // ============================================================================
    
    // Générateur Java
    function JavaGenerator() {
        this.name = 'Java';
    }
    
    JavaGenerator.prototype.generate = function(umlData) {
        var self = this;
        var code = '';
        
        if (!umlData || !umlData.classes || umlData.classes.length === 0) {
            return '// No classes found in the diagram';
        }
        
        umlData.classes.forEach(function(classInfo) {
            code += self.generateClass(classInfo);
            code += '\n\n';
        });
        
        return code.trim();
    };
    
    JavaGenerator.prototype.generateClass = function(classInfo) {
        var code = '';
        
        code += 'public class ' + classInfo.name + ' {\n';
        
        // Attributs
        if (classInfo.attributes && classInfo.attributes.length > 0) {
            classInfo.attributes.forEach(function(attr) {
                var visibility = attr.visibility || 'private';
                var type = attr.type || 'Object';
                code += '    ' + visibility + ' ' + type + ' ' + attr.name + ';\n';
            });
            code += '\n';
        }
        
        // Constructeur
        code += '    public ' + classInfo.name + '() {\n';
        code += '        // Default constructor\n';
        code += '    }\n\n';
        
        // Getters et Setters
        if (classInfo.attributes && classInfo.attributes.length > 0) {
            classInfo.attributes.forEach(function(attr) {
                var type = attr.type || 'Object';
                var name = attr.name;
                var capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
                
                code += '    public ' + type + ' get' + capitalizedName + '() {\n';
                code += '        return this.' + name + ';\n';
                code += '    }\n\n';
                
                code += '    public void set' + capitalizedName + '(' + type + ' ' + name + ') {\n';
                code += '        this.' + name + ' = ' + name + ';\n';
                code += '    }\n\n';
            });
        }
        
        // Méthodes
        if (classInfo.methods && classInfo.methods.length > 0) {
            classInfo.methods.forEach(function(method) {
                if (method.name.indexOf('get') !== 0 && method.name.indexOf('set') !== 0) {
                    var visibility = method.visibility || 'public';
                    code += '    ' + visibility + ' void ' + method.name + '() {\n';
                    code += '        // TODO: Implement method\n';
                    code += '    }\n\n';
                }
            });
        }
        
        code += '}';
        return code;
    };
    
    // Générateur Python
    function PythonGenerator() {
        this.name = 'Python';
    }
    
    PythonGenerator.prototype.generate = function(umlData) {
        var self = this;
        var code = '';
        
        if (!umlData || !umlData.classes || umlData.classes.length === 0) {
            return '# No classes found in the diagram';
        }
        
        umlData.classes.forEach(function(classInfo) {
            code += self.generateClass(classInfo);
            code += '\n\n';
        });
        
        return code.trim();
    };
    
    PythonGenerator.prototype.generateClass = function(classInfo) {
        var code = '';
        
        code += 'class ' + classInfo.name + ':\n';
        code += '    def __init__(self):\n';
        
        if (classInfo.attributes && classInfo.attributes.length > 0) {
            classInfo.attributes.forEach(function(attr) {
                var name = attr.name;
                var type = attr.type || 'Any';
                code += '        self._' + name + ' = None  # ' + type + '\n';
            });
        } else {
            code += '        pass\n';
        }
        
        code += '\n';
        
        // Properties
        if (classInfo.attributes && classInfo.attributes.length > 0) {
            classInfo.attributes.forEach(function(attr) {
                var name = attr.name;
                
                code += '    @property\n';
                code += '    def ' + name + '(self):\n';
                code += '        return self._' + name + '\n\n';
                
                code += '    @' + name + '.setter\n';
                code += '    def ' + name + '(self, value):\n';
                code += '        self._' + name + ' = value\n\n';
            });
        }
        
        // Méthodes
        if (classInfo.methods && classInfo.methods.length > 0) {
            classInfo.methods.forEach(function(method) {
                code += '    def ' + method.name + '(self):\n';
                code += '        # TODO: Implement method\n';
                code += '        pass\n\n';
            });
        }
        
        return code.trimEnd ? code.trimEnd() : code.replace(/\s+$/, '');
    };
    
    // Générateur TypeScript
    function TypeScriptGenerator() {
        this.name = 'TypeScript';
    }
    
    TypeScriptGenerator.prototype.generate = function(umlData) {
        var self = this;
        var code = '';
        
        if (!umlData || !umlData.classes || umlData.classes.length === 0) {
            return '// No classes found in the diagram';
        }
        
        umlData.classes.forEach(function(classInfo) {
            code += self.generateClass(classInfo);
            code += '\n\n';
        });
        
        return code.trim();
    };
    
    TypeScriptGenerator.prototype.generateClass = function(classInfo) {
        var code = '';
        
        code += 'export class ' + classInfo.name + ' {\n';
        
        // Attributs
        if (classInfo.attributes && classInfo.attributes.length > 0) {
            classInfo.attributes.forEach(function(attr) {
                var visibility = attr.visibility || 'private';
                var type = attr.type || 'any';
                code += '    ' + visibility + ' ' + attr.name + ': ' + type + ';\n';
            });
            code += '\n';
        }
        
        // Constructeur
        code += '    constructor() {\n';
        if (classInfo.attributes && classInfo.attributes.length > 0) {
            classInfo.attributes.forEach(function(attr) {
                code += '        this.' + attr.name + ' = null;\n';
            });
        }
        code += '    }\n\n';
        
        // Getters et Setters
        if (classInfo.attributes && classInfo.attributes.length > 0) {
            classInfo.attributes.forEach(function(attr) {
                var type = attr.type || 'any';
                var name = attr.name;
                var capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
                
                code += '    public get' + capitalizedName + '(): ' + type + ' {\n';
                code += '        return this.' + name + ';\n';
                code += '    }\n\n';
                
                code += '    public set' + capitalizedName + '(value: ' + type + '): void {\n';
                code += '        this.' + name + ' = value;\n';
                code += '    }\n\n';
            });
        }
        
        // Méthodes
        if (classInfo.methods && classInfo.methods.length > 0) {
            classInfo.methods.forEach(function(method) {
                if (method.name.indexOf('get') !== 0 && method.name.indexOf('set') !== 0) {
                    var visibility = method.visibility || 'public';
                    code += '    ' + visibility + ' ' + method.name + '(): void {\n';
                    code += '        // TODO: Implement method\n';
                    code += '    }\n\n';
                }
            });
        }
        
        code += '}';
        return code;
    };
    
    // CodeGenerator principal
    function CodeGenerator() {
        this.generators = {
            java: new JavaGenerator(),
            python: new PythonGenerator(),
            typescript: new TypeScriptGenerator()
        };
    }
    
    CodeGenerator.prototype.generate = function(umlData, language) {
        console.log('Code Generator: Generating code for language:', language);
        
        if (!this.generators[language]) {
            throw new Error('Language not supported: ' + language);
        }
        
        return this.generators[language].generate(umlData);
    };
    
    // ============================================================================
    // INCLUDE: diagram-generator.js (Simplifié - sera dans codeimport.js)
    // ============================================================================
    
    // Voir codeimport.js pour la génération de diagrammes depuis le code
    
    // ============================================================================
    // Interface utilisateur - Code Panel
    // ============================================================================
    
    function createCodePanel() {
        var container = document.createElement('div');
        container.id = 'codePanel';
        container.style.cssText = 'position: fixed; top: 0; right: -400px; width: 400px; height: 100%; background: #f8f9fa; border-left: 1px solid #ddd; transition: right 0.3s ease; z-index: 1000; display: flex; flex-direction: column;';
        
        // En-tête
        var header = document.createElement('div');
        header.style.cssText = 'padding: 10px; background: #007bff; color: white; display: flex; justify-content: space-between; align-items: center;';
        
        var title = document.createElement('h3');
        title.textContent = 'Code Generator';
        title.style.cssText = 'margin: 0; font-size: 16px;';
        header.appendChild(title);
        
        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;';
        closeBtn.onclick = toggleCodePanel;
        header.appendChild(closeBtn);
        
        container.appendChild(header);
        
        // Contrôles
        var controls = document.createElement('div');
        controls.style.cssText = 'padding: 10px; border-bottom: 1px solid #ddd;';
        
        var langLabel = document.createElement('label');
        langLabel.textContent = 'Language: ';
        langLabel.style.cssText = 'margin-right: 10px;';
        controls.appendChild(langLabel);
        
        var langSelect = document.createElement('select');
        langSelect.id = 'codegen-language-select';
        langSelect.style.cssText = 'padding: 5px; border: 1px solid #ccc; border-radius: 3px;';
        
        ['java', 'python', 'typescript'].forEach(function(lang) {
            var option = document.createElement('option');
            option.value = lang;
            option.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
            if (lang === currentLanguage) option.selected = true;
            langSelect.appendChild(option);
        });
        
        langSelect.onchange = function() {
            currentLanguage = this.value;
            updateCodeDisplay();
        };
        
        controls.appendChild(langSelect);
        
        // Bouton Refresh
        var genCode = document.createElement('button');
        genCode.textContent = 'Generate Code';
        genCode.style.cssText = 'margin-left: 10px; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;';
        genCode.onclick = updateCodeDisplay; // Fonction qui est activée au clic
        controls.appendChild(genCode);
        
        // Bouton Import Code
        var genDiag = document.createElement('button');
        genDiag.textContent = 'Generate Diagram';
        genDiag.style.cssText = 'margin-left: 10px; padding: 5px 10px; background: #ff8c00; color: white; border: none; border-radius: 3px; cursor: pointer;';
        genDiag.onclick = function() {
            var textarea = document.getElementById('codeTextarea');
            if (textarea && textarea.value.trim()) {
                // TODO: Implémenter la génération de diagramme depuis le code
                console.log('Import Code: Generating diagram from code...');
                ui.showError('Feature coming soon: Generate diagram from code');
            } else {
                ui.showError('Please paste code in the text area first');
            }
        };
        controls.appendChild(genDiag);
        
        container.appendChild(controls);
        
        // Zone de code
        var codeContainer = document.createElement('div');
        codeContainer.style.cssText = 'flex: 1; padding: 10px; overflow: auto;';
        
        var codeTextarea = document.createElement('textarea');
        codeTextarea.id = 'codeTextarea';
        codeTextarea.style.cssText = 'width: 100%; height: 100%; font-family: "Courier New", monospace; font-size: 12px; border: 1px solid #ccc; padding: 10px; resize: none; background: white;';
        codeTextarea.readOnly = false;
        codeTextarea.placeholder = 'Click "Refresh" to generate code from the current diagram...';
        
        codeContainer.appendChild(codeTextarea);
        container.appendChild(codeContainer);
        
        // Boutons d'action
        var actions = document.createElement('div');
        actions.style.cssText = 'padding: 10px; border-top: 1px solid #ddd; display: flex; gap: 10px;';
        
        var copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy to Clipboard';
        copyBtn.style.cssText = 'flex: 1; padding: 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;';
        copyBtn.onclick = function() {
            codeTextarea.select();
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(function() {
                copyBtn.textContent = 'Copy to Clipboard';
            }, 2000);
        };
        actions.appendChild(copyBtn);
        
        var saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save as File';
        saveBtn.style.cssText = 'flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;';
        saveBtn.onclick = saveCodeToFile;
        actions.appendChild(saveBtn);
        
        container.appendChild(actions);
        
        document.body.appendChild(container);
        
        return container;
    }
    
    function toggleCodePanel() {
        isCodePanelVisible = !isCodePanelVisible;
        if (codePanel) {
            codePanel.style.right = isCodePanelVisible ? '0' : '-400px';
            if (isCodePanelVisible) {
                updateCodeDisplay();
            }
        }
    }
    
    function updateCodeDisplay() {
        try {
            console.log('Code Generator: Updating code display...');
            
            var analyzer = new UMLAnalyzer();
            var umlData = analyzer.analyzeCurrentDiagram(ui);
            
            console.log('Code Generator: UML Data:', umlData);
            
            var generator = new CodeGenerator();
            var code = generator.generate(umlData, currentLanguage);
            
            var textarea = document.getElementById('codeTextarea');
            if (textarea) {
                textarea.value = code;
            }
            
            console.log('Code Generator: Code updated successfully');
        } catch (e) {
            console.error('Code Generator: Error updating code:', e);
            ui.handleError(e);
        }
    }
    
    function saveCodeToFile() {
        var textarea = document.getElementById('codeTextarea');
        if (!textarea || !textarea.value) return;
        
        var extension = currentLanguage === 'java' ? '.java' : 
                       currentLanguage === 'python' ? '.py' : '.ts';
        var filename = 'generated_code' + extension;
        
        var blob = new Blob([textarea.value], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // ============================================================================
    // Initialisation de l'interface
    // ============================================================================
    
    // Créer le panneau de code
    codePanel = createCodePanel();
    
    // Ajouter l'action au système d'actions de Draw.io
    ui.actions.addAction('codeGenerator', toggleCodePanel);
    
    // Ajouter un bouton à la barre d'outils
    if (ui.toolbar != null) {
        // Créer un élément de bouton personnalisé
        var elt = ui.toolbar.addSeparator();
        
        var button = mxUtils.button('⚡', function(evt) {
            toggleCodePanel();
        });
        
        button.setAttribute('title', 'Code Generator');
        button.style.cssText = 'display:inline-block;padding:4px 8px;font-size:18px;cursor:pointer;background:#007bff;color:white;border:none;border-radius:3px;margin:2px;';
        
        ui.toolbar.container.appendChild(button);
    }
    
    // Ajouter au menu Extras
    var extrasMenu = ui.menus.get('extras');
    if (extrasMenu != null) {
        var oldFunct = extrasMenu.funct;
        extrasMenu.funct = function(menu, parent) {
            oldFunct.apply(this, arguments);
            ui.menus.addMenuItems(menu, ['-', 'codeGenerator'], parent);
        };
    }
    
    console.log('Code Generator Plugin: Loaded successfully!');
});
