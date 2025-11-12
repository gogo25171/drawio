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
    // INCLUDE: diagram-generator.js
    // ============================================================================
    
    /**
     * Générateur de diagrammes UML depuis le code
     */
    function DiagramGenerator(ui) {
        this.ui = ui;
        this.graph = ui.editor.graph;
        this.model = this.graph.getModel();
    }
    
    DiagramGenerator.prototype.generateFromCode = function(code, language) {
        console.log('Diagram Generator: Generating diagram from code...');
        
        var parser = this.getParser(language);
        if (!parser) {
            throw new Error('Language not supported: ' + language);
        }
        
        var parseResult = parser.parse(code);
        
        // Support pour les parsers qui retournent soit un tableau, soit un objet {classes, relationships}
        var classes = parseResult.classes || parseResult;
        var relationships = parseResult.relationships || [];
        
        console.log('Diagram Generator: Found ' + classes.length + ' classes');
        console.log('Diagram Generator: Found ' + relationships.length + ' relationships');
        
        if (classes.length === 0) {
            throw new Error('No classes found in the code');
        }
        
        this.createDiagram(classes, relationships);
    };
    
    DiagramGenerator.prototype.getParser = function(language) {
        switch(language) {
            case 'java': return new JavaParser();
            case 'python': return new PythonParser();
            case 'typescript': return new TypeScriptParser();
            default: return null;
        }
    };
    
    DiagramGenerator.prototype.createDiagram = function(classes, relationships) {
        var self = this;
        var graph = this.graph;
        var parent = graph.getDefaultParent();
        
        this.model.beginUpdate();
        try {
            // Calculer la disposition en grille
            var cols = Math.ceil(Math.sqrt(classes.length));
            var cellWidth = 200;
            var cellHeight = 150;
            var spacing = 50;
            
            // Créer un map pour stocker les cellules par nom de classe
            var classCells = {};
            
            classes.forEach(function(classInfo, index) {
                var col = index % cols;
                var row = Math.floor(index / cols);
                var x = 50 + col * (cellWidth + spacing);
                var y = 50 + row * (cellHeight + spacing);
                
                var cell = self.createClassCell(classInfo, x, y, cellWidth, cellHeight, parent);
                classCells[classInfo.name] = cell;
            });
            
            // Créer les relations (flèches)
            if (relationships && relationships.length > 0) {
                relationships.forEach(function(rel) {
                    var sourceCell = classCells[rel.from];
                    var targetCell = classCells[rel.to];
                    
                    if (sourceCell && targetCell) {
                        self.createRelationship(sourceCell, targetCell, rel.type, parent);
                    }
                });
            }
            
        } finally {
            this.model.endUpdate();
        }
        
        console.log('Diagram Generator: Diagram created successfully');
    };
    
    DiagramGenerator.prototype.createClassCell = function(classInfo, x, y, width, height, parent) {
        var graph = this.graph;
        var model = this.model;
        
        // Calculer la hauteur totale nécessaire
        var headerHeight = 26;
        var attributesHeight = (classInfo.attributes && classInfo.attributes.length > 0) ? 
                               (classInfo.attributes.length * 26 + 8) : 0; // +8 pour la ligne de séparation
        var methodsHeight = (classInfo.methods && classInfo.methods.length > 0) ? 
                           classInfo.methods.length * 26 : 0;
        var totalHeight = headerHeight + attributesHeight + methodsHeight;
        
        // Modifier le style si la classe est abstraite
        var className = classInfo.name;
        if (classInfo.isAbstract) {
            className = '«abstract»\n' + classInfo.name;
        }
        
        // Créer la cellule de classe principale avec style UML
        var classCell = graph.insertVertex(parent, null, className, x, y, width, totalHeight,
            'swimlane;fontStyle=' + (classInfo.isAbstract ? '3' : '1') + ';align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;');
        
        var currentY = 0;
        
        // Ajouter les attributs
        if (classInfo.attributes && classInfo.attributes.length > 0) {
            classInfo.attributes.forEach(function(attr) {
                var symbol = attr.visibility === 'public' ? '+' : 
                            attr.visibility === 'private' ? '-' : '#';
                var text = symbol + ' ' + attr.name + ': ' + attr.type;
                
                graph.insertVertex(classCell, null, text, 0, currentY, width, 26,
                    'text;strokeColor=inherit;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;');
                currentY += 26;
            });
            
            // Ligne de séparation
            graph.insertVertex(classCell, null, '', 0, currentY, width, 8,
                'line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];portConstraint=eastwest;strokeColor=inherit;');
            currentY += 8;
        }
        
        // Ajouter les méthodes
        if (classInfo.methods && classInfo.methods.length > 0) {
            classInfo.methods.forEach(function(method) {
                var symbol = method.visibility === 'public' ? '+' : 
                            method.visibility === 'private' ? '-' : '#';
                var text = symbol + ' ' + method.name + '()';
                
                // Si la méthode est abstraite, mettre en italique
                var fontStyle = method.isAbstract ? 'fontStyle=2;' : '';
                
                graph.insertVertex(classCell, null, text, 0, currentY, width, 26,
                    'text;strokeColor=inherit;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;' + fontStyle);
                currentY += 26;
            });
        }
        
        return classCell;
    };
    
    DiagramGenerator.prototype.createRelationship = function(sourceCell, targetCell, type, parent) {
        var graph = this.graph;
        var style = '';
        
        // Définir le style selon le type de relation
        switch(type) {
            case 'inheritance':
                // Flèche d'héritage (triangle vide)
                style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=0;endSize=12;';
                break;
            case 'implementation':
                // Flèche d'implémentation (triangle vide + ligne pointillée)
                style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;endArrow=block;endFill=0;endSize=12;';
                break;
            case 'aggregation':
                // Agrégation (losange vide)
                style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=diamond;endFill=0;endSize=12;';
                break;
            case 'composition':
                // Composition (losange plein)
                style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=diamond;endFill=1;endSize=12;';
                break;
            case 'dependency':
                // Dépendance (ligne pointillée avec flèche simple)
                style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;endArrow=open;endSize=12;';
                break;
            default:
                // Association par défaut
                style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endSize=12;';
        }
        
        var edge = graph.insertEdge(parent, null, '', sourceCell, targetCell, style);
        
        return edge;
    };
    
    // ============================================================================
    // include: code-parsers.js
    // ============================================================================
    
    /**
     * Parser Java
     */
    function JavaParser() {}
    
    JavaParser.prototype.parse = function(code) {
        var classes = [];
        var relationships = [];
        
        // Regex pour détecter les classes (incluant abstract)
        var classRegex = /(?:public\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
        var match;
        
        while ((match = classRegex.exec(code)) !== null) {
            var className = match[1];
            var extendsClass = match[2]; // Classe parente si extends
            var classStartIndex = match.index;
            
            // Détecter si la classe est abstraite
            var classDeclaration = code.substring(Math.max(0, classStartIndex - 20), classStartIndex + 50);
            var isAbstract = classDeclaration.indexOf('abstract') !== -1;
            
            // Trouver le bloc de la classe
            var braceCount = 0;
            var inClass = false;
            var classEndIndex = classStartIndex;
            
            for (var i = classStartIndex; i < code.length; i++) {
                if (code[i] === '{') {
                    braceCount++;
                    inClass = true;
                } else if (code[i] === '}') {
                    braceCount--;
                    if (inClass && braceCount === 0) {
                        classEndIndex = i;
                        break;
                    }
                }
            }
            
            var classCode = code.substring(classStartIndex, classEndIndex + 1);
            var classInfo = {
                name: className,
                isAbstract: isAbstract,
                attributes: this.extractAttributes(classCode),
                methods: this.extractMethods(classCode, isAbstract)
            };
            
            classes.push(classInfo);
            
            // Créer la relation d'héritage si extends
            if (extendsClass) {
                relationships.push({
                    from: className,
                    to: extendsClass,
                    type: 'inheritance'
                });
            }
        }
        
        console.log('JavaParser: Found classes:', classes);
        console.log('JavaParser: Found relationships:', relationships);
        
        return { classes: classes, relationships: relationships };
    };
    
    JavaParser.prototype.extractAttributes = function(classCode) {
        var attributes = [];
        
        // Regex améliorée pour capturer différents formats d'attributs
        // Format 1: private/public/protected Type name;
        var attrRegex1 = /(private|public|protected)?\s*(\w+)\s+(\w+)\s*;/g;
        // Format 2: Type name; (sans modificateur explicite)
        
        var lines = classCode.split('\n');
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            
            // Ignorer les lignes vides, commentaires, méthodes, et la déclaration de classe
            if (!line || line.startsWith('//') || line.startsWith('/*') || 
                line.startsWith('*') || line.indexOf('(') !== -1 || 
                line.indexOf('class ') !== -1 || line.indexOf('{') === line.length - 1) {
                continue;
            }
            
            // Détecter les attributs (lignes se terminant par ;)
            if (line.indexOf(';') !== -1 && line.indexOf('(') === -1) {
                var parts = line.replace(';', '').trim().split(/\s+/);
                
                if (parts.length >= 2) {
                    var visibility = 'private'; // par défaut
                    var type = '';
                    var name = '';
                    
                    if (parts[0] === 'private' || parts[0] === 'public' || parts[0] === 'protected') {
                        visibility = parts[0];
                        type = parts[1];
                        name = parts[2];
                    } else {
                        type = parts[0];
                        name = parts[1];
                    }
                    
                    if (name && type) {
                        attributes.push({
                            visibility: visibility,
                            type: type,
                            name: name
                        });
                    }
                }
            }
        }
        
        console.log('JavaParser: Found attributes:', attributes);
        return attributes;
    };
    
    JavaParser.prototype.extractMethods = function(classCode, isAbstract) {
        var methods = [];
        
        // Extraire le nom de la classe pour filtrer le constructeur
        var classNameMatch = classCode.match(/class\s+(\w+)/);
        var className = classNameMatch ? classNameMatch[1] : '';
        
        var lines = classCode.split('\n');
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            
            // Détecter les méthodes (lignes contenant des parenthèses mais pas de ;)
            if (line.indexOf('(') !== -1 && line.indexOf(')') !== -1) {
                // Ignorer les commentaires et les appels de méthodes
                if (line.startsWith('//') || line.startsWith('/*') || 
                    line.startsWith('*') || line.indexOf('=') !== -1) {
                    continue;
                }
                
                // Détecter si la méthode est abstraite
                var isMethodAbstract = line.indexOf('abstract') !== -1;
                
                // Regex pour capturer les méthodes
                var methodMatch = line.match(/(?:abstract\s+)?(private|public|protected)?\s*(\w+)\s+(\w+)\s*\(/);
                
                if (!methodMatch) {
                    // Essayer de matcher un constructeur: ClassName(...)
                    methodMatch = line.match(/(\w+)\s*\(/);
                    if (methodMatch && methodMatch[1] === className) {
                        // C'est un constructeur, on peut l'ajouter ou l'ignorer
                        continue; // Pour l'instant on ignore les constructeurs
                    }
                } else {
                    var visibility = methodMatch[1] || 'public';
                    var returnType = methodMatch[2];
                    var methodName = methodMatch[3];
                    
                    // Filtrer les getters/setters si souhaité
                    if (methodName && methodName !== className) {
                        methods.push({
                            visibility: visibility,
                            name: methodName,
                            returnType: returnType,
                            isAbstract: isMethodAbstract
                        });
                    }
                }
            }
        }
        
        console.log('JavaParser: Found methods:', methods);
        return methods;
    };
    
    /**
     * Parser Python
     */
    function PythonParser() {}
    
    PythonParser.prototype.parse = function(code) {
        var classes = [];
        var relationships = [];
        
        // Regex pour détecter les classes
        var classRegex = /class\s+(\w+)(?:\((\w+)\))?/g;
        var match;
        
        while ((match = classRegex.exec(code)) !== null) {
            var className = match[1];
            var parentClass = match[2]; // Classe parente si héritage
            var classStartIndex = match.index;
            
            // Trouver la fin de la classe (prochaine classe ou fin du fichier)
            var nextClassMatch = classRegex.exec(code);
            var classEndIndex = nextClassMatch ? nextClassMatch.index : code.length;
            classRegex.lastIndex = classStartIndex + 1;
            
            var classCode = code.substring(classStartIndex, classEndIndex);
            var classInfo = {
                name: className,
                attributes: this.extractAttributes(classCode),
                methods: this.extractMethods(classCode)
            };
            
            classes.push(classInfo);
            
            // Créer la relation d'héritage si parentClass existe et n'est pas object
            if (parentClass && parentClass !== 'object') {
                relationships.push({
                    from: className,
                    to: parentClass,
                    type: 'inheritance'
                });
            }
        }
        
        console.log('PythonParser: Found classes:', classes);
        console.log('PythonParser: Found relationships:', relationships);
        
        return { classes: classes, relationships: relationships };
    };
    
    PythonParser.prototype.extractAttributes = function(classCode) {
        var attributes = [];
        
        // Format 1: self._name = None  # Type
        var attrRegex1 = /self\._(\w+)\s*=.*?#\s*(\w+)/g;
        var match;
        
        while ((match = attrRegex1.exec(classCode)) !== null) {
            attributes.push({
                visibility: 'private',
                type: match[2],
                name: match[1]
            });
        }
        
        // Format 2: self.name = value (attributs publics)
        var attrRegex2 = /self\.([a-z_]\w*)\s*=/g;
        while ((match = attrRegex2.exec(classCode)) !== null) {
            var attrName = match[1];
            // Éviter les doublons avec les attributs privés
            if (!attrName.startsWith('_')) {
                var alreadyExists = false;
                for (var i = 0; i < attributes.length; i++) {
                    if (attributes[i].name === attrName) {
                        alreadyExists = true;
                        break;
                    }
                }
                if (!alreadyExists) {
                    attributes.push({
                        visibility: 'public',
                        type: 'Any',
                        name: attrName
                    });
                }
            }
        }
        
        console.log('PythonParser: Found attributes:', attributes);
        return attributes;
    };
    
    PythonParser.prototype.extractMethods = function(classCode) {
        var methods = [];
        var methodRegex = /def\s+(\w+)\s*\(self[^)]*\)/g;
        var match;
        
        while ((match = methodRegex.exec(classCode)) !== null) {
            var methodName = match[1];
            // Filtrer __init__ et les méthodes spéciales
            if (methodName !== '__init__' && !methodName.startsWith('__')) {
                var visibility = methodName.startsWith('_') ? 'private' : 'public';
                methods.push({
                    visibility: visibility,
                    name: methodName
                });
            }
        }
        
        console.log('PythonParser: Found methods:', methods);
        return methods;
    };
    
    /**
     * Parser TypeScript
     */
    function TypeScriptParser() {}
    
    TypeScriptParser.prototype.parse = function(code) {
        var classes = [];
        var relationships = [];
        
        // Regex pour détecter les classes (incluant abstract et extends)
        var classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
        var match;
        
        while ((match = classRegex.exec(code)) !== null) {
            var className = match[1];
            var extendsClass = match[2]; // Classe parente si extends
            var classStartIndex = match.index;
            
            // Détecter si la classe est abstraite
            var classDeclaration = code.substring(Math.max(0, classStartIndex - 20), classStartIndex + 50);
            var isAbstract = classDeclaration.indexOf('abstract') !== -1;
            
            // Trouver le bloc de la classe
            var braceCount = 0;
            var inClass = false;
            var classEndIndex = classStartIndex;
            
            for (var i = classStartIndex; i < code.length; i++) {
                if (code[i] === '{') {
                    braceCount++;
                    inClass = true;
                } else if (code[i] === '}') {
                    braceCount--;
                    if (inClass && braceCount === 0) {
                        classEndIndex = i;
                        break;
                    }
                }
            }
            
            var classCode = code.substring(classStartIndex, classEndIndex + 1);
            var classInfo = {
                name: className,
                isAbstract: isAbstract,
                attributes: this.extractAttributes(classCode),
                methods: this.extractMethods(classCode)
            };
            
            classes.push(classInfo);
            
            // Créer la relation d'héritage si extends
            if (extendsClass) {
                relationships.push({
                    from: className,
                    to: extendsClass,
                    type: 'inheritance'
                });
            }
        }
        
        console.log('TypeScriptParser: Found classes:', classes);
        console.log('TypeScriptParser: Found relationships:', relationships);
        
        return { classes: classes, relationships: relationships };
    };
    
    TypeScriptParser.prototype.extractAttributes = function(classCode) {
        var attributes = [];
        var attrRegex = /(private|public|protected)?\s+(\w+)\s*:\s*(\w+)/g;
        var match;
        
        while ((match = attrRegex.exec(classCode)) !== null) {
            var visibility = match[1] || 'public';
            var name = match[2];
            var type = match[3];
            
            // Éviter de capturer les paramètres de méthode
            var beforeMatch = classCode.substring(Math.max(0, match.index - 50), match.index);
            if (beforeMatch.indexOf('(') === -1 || beforeMatch.lastIndexOf(')') > beforeMatch.lastIndexOf('(')) {
                attributes.push({
                    visibility: visibility,
                    name: name,
                    type: type
                });
            }
        }
        
        console.log('TypeScriptParser: Found attributes:', attributes);
        return attributes;
    };
    
    TypeScriptParser.prototype.extractMethods = function(classCode) {
        var methods = [];
        var methodRegex = /(private|public|protected)?\s+(\w+)\s*\([^)]*\)\s*:\s*\w+|(\w+)\s*\([^)]*\)\s*\{/g;
        var match;
        
        while ((match = methodRegex.exec(classCode)) !== null) {
            var visibility = match[1] || 'public';
            var methodName = match[2] || match[3];
            
            // Filtrer les getters/setters et constructeur
            if (methodName && !methodName.match(/^(get|set)[A-Z]/) && methodName !== 'constructor') {
                methods.push({
                    visibility: visibility,
                    name: methodName
                });
            }
        }
        
        console.log('TypeScriptParser: Found methods:', methods);
        return methods;
    };
        
    // ============================================================================
    // INCLUDE: ui-components.js
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
                try {
                    console.log('Import Code: Generating diagram from code...');
                    
                    // Créer le générateur de diagrammes
                    var diagramGenerator = new DiagramGenerator(ui);
                    
                    // Générer le diagramme depuis le code
                    diagramGenerator.generateFromCode(textarea.value, currentLanguage);
                    
                    // Message de succès
                    if (ui.editor && ui.editor.setStatus) {
                        ui.editor.setStatus('Diagram generated successfully from code!');
                    }
                    
                } catch (e) {
                    console.error('Import Code: Error generating diagram:', e);
                    var errorMsg = e.message || 'An error occurred while generating the diagram';
                    if (ui.showError) {
                        ui.showError('Error: ' + errorMsg);
                    } else {
                        alert('Error: ' + errorMsg);
                    }
                }
            } else {
                if (ui.showError) {
                    ui.showError('Please paste code in the text area first');
                } else {
                    alert('Please paste code in the text area first');
                }
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
    // include: plugin-initialization.js (TODO : Voir si c'est bien de le mettre comme ça)
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
