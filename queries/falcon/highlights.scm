; Keywords
"struct"    @keyword
"routine"   @keyword
"state"     @keyword
"autotuner" @keyword
"if"        @keyword.conditional
"elif"      @keyword.conditional
"else"      @keyword.conditional
"import"    @keyword.import
"ffimport"  @keyword.import
"terminal"  @keyword.return
"start"     @keyword
"this"      @constant.builtin

; Types
(type (type_args_open) @punctuation.bracket (#set! priority 300))
(type (type_args_close) @punctuation.bracket (#set! priority 300))
(module_sep)      @punctuation.delimiter (#set! priority 300)
(type
  (qualified_type
    module: (qualified_type
      symbol: (identifier) @module (#set! priority 201))
    (module_sep)      @punctuation.delimiter (#set! priority 300)
    symbol: (identifier) @type.definition (#set! priority 200)))
(type ; [7, 17] - [7, 39]
  (qualified_type ; [7, 17] - [7, 39]
    symbol: (identifier)) @type.definition (#set! priority 200))
(entry_target) @function.method
(param_decl type: (type) @type.definition 
  param_name: (identifier) @variable (#set! priority 200))
(generic_param_list
  (type_args_open) @punctuation.bracket)

(generic_param_list
  (type_args_close) @punctuation.bracket)

(type_parameter
  (identifier) @type.definition)

; Declaration names — priority 200 to override fallback
(struct_decl
  name: (identifier) @type.definition)
(autotuner_decl
  name: (identifier) @type.definition)
(routine_decl name: (identifier) @function (#set! priority 200))
(struct_routine_decl name: (identifier) @function (#set! priority 200))
(state_decl name: (identifier) @function.method (#set! priority 200))

; Struct field declarations
(struct_field_decl name: (identifier) @variable)

; Assignments and transitions
(assignment_target
  (variable) @variable)
(transition_stmt 
  target: (identifier) @function.method (#set! priority 201))

; Calls and members
(var_decl_stmt
  variable_name: (variable) @variable)
(struct_field_decl
  name: (identifier) @property.definition)
(assign_stmt
  targets: (assignment_target
    (member_expr
      member: (identifier) @property)))
(var_decl_stmt
  variable_name: (variable) @variable)

(param_decl
  param_name: (identifier) @variable.parameter)

(var_decl_stmt
  variable_name: (variable) @variable)

(assignment_target
  (variable) @variable)

(member_expr
  member: (identifier) @property)

(call_expr
  func: (qualified_name
    symbol: (identifier) @function.call))

(call_expr
  func: (member_expr
    member: (identifier) @function.method.call))


; Module-qualified names in expressions / uses clauses
(call_expr
  func: (qualified_name
    symbol: (identifier) @function.call
      (#set! priority 300)))
(member_expr
  object: (qualified_name
    symbol: (identifier) @variable))
(call_expr
  func: (member_expr
    object: (qualified_name
      symbol: (identifier) @type (#set! priority 301))
    member: (identifier) @function.call
      (#match? @function.call "^New")
      (#set! priority 301)))

; Highlight modules (supports 1-2 nesting levels)
;; Color module portion in io::println
(qualified_name
  module: (qualified_name
    symbol: (identifier) @module (#set! priority 201))
  (module_sep)      @punctuation.delimiter (#set! priority 300)
  symbol: (identifier) @function.call (#set! priority 200))
(var_decl_stmt
  variable_name: (variable) @variable
  (#set! priority 201))
(autotuner_var_decl
  name: (identifier) @variable
  (#set! priority 201))
(param_decl
  param_name: (identifier) @variable.parameter
  (#set! priority 201))
(assignment_target
  (variable) @variable
  (#set! priority 201))
; Fallback identifier expression
(qualified_name
  symbol: (identifier) @variable)

; index in get expression
(index_expr (_ (identifier) @variable))

; Import paths
(import_stmt    path:    (string_literal) @string.special.path)
(ffimport_decl  wrapper: (string_literal) @string.special.path)

; Operators
(operator) @operator

; Punctuation
["{" "}"] @punctuation.bracket
["(" ")"] @punctuation.bracket
["[" "]"] @punctuation.bracket
(direction) @punctuation.delimiter
";"       @punctuation.delimiter
","       @punctuation.delimiter
"."       @punctuation.delimiter
"="       @operator.assignment

; Literals
(int_literal)    @number
(float_literal)  @number.float
(bool_literal)   @boolean
(nil_literal)    @number
(string_literal) @string

; Comments
(comment) @comment @spell
