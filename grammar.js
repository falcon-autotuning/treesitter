/**
 * TreeSitter grammar for the Falcon Autotuner DSL (.fal files)
 * Mirrors the Bison grammar in autotuner/compiler/src/parser.y
 */
module.exports = grammar({
  name: 'falcon',  // Must match the compiled .so symbol: tree_sitter_falcon

  extras: $ => [
    /\s/,
    $.comment,
  ],

  conflicts: $ => [
    [$.qualified_name, $.qualified_type],
  ],

  rules: {
    // -----------------------------------------------------------------------
    // Top-level program
    // -----------------------------------------------------------------------
    program: $ => repeat(
      choice(
        $.import_stmt,
        $.ffimport_decl,
        $.struct_decl,
        $.routine_decl,
        $.autotuner_decl,
      )
    ),

    // -----------------------------------------------------------------------
    // Comments
    // -----------------------------------------------------------------------
    comment: $ => token(choice(
      seq('//', /.*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')
    )),

    // -----------------------------------------------------------------------
    // Import statements (single or multi-path)
    // -----------------------------------------------------------------------
    import_stmt: $ => choice(
      seq('import', field('path', $.string_literal), ';'),
      seq('import', '(', repeat1(field('paths', $.string_literal)), ')'),
    ),

    // -----------------------------------------------------------------------
    // FFI import declarations
    // -----------------------------------------------------------------------
    ffimport_decl: $ => seq(
      'ffimport',
      field('wrapper', $.string_literal),
      field('imports', seq('(', repeat($.string_literal), ')')),
      field('libs', seq('(', repeat($.string_literal), ')'))
    ),

    // -----------------------------------------------------------------------
    // Struct declarations: fields and routines may interleave in source but
    // parser.y enforces struct_field_list then struct_routine_list.
    // We keep interleaving here for resilience; the test corpus only uses
    // fields-first order anyway.
    // -----------------------------------------------------------------------
    type_parameter: $ => $.identifier,
    generic_param_list: $ => seq(
      alias('<', $.type_args_open),
      commaSep1($.type_parameter),
      alias('>', $.type_args_close),
    ),
    struct_decl: $ => seq(
      'struct',
      field('name', $.identifier),
      optional(field('generic_params', $.generic_param_list)),
      '{',
      repeat(choice($.struct_field_decl, $.struct_routine_decl)),
      '}',
    ),

    struct_field_decl: $ => seq(
      field('type', $.type),
      field('name', $.identifier),
      optional(seq('=', field('default', $._expr))),
      ';'
    ),

    // Routine inside a struct.
    // FIX: inputs is optional — parser.y's input_params has a %empty production,
    //      so `routine Value -> (int value) { ... }` (no input parens) is valid.
    // FIX: body uses struct_routine_body (not block) so statements are NOT
    //      wrapped in a `stmt` node, matching parser.y's routine_body_stmts.
    struct_routine_decl: $ => seq(
      'routine',
      field('name', $.identifier),
      optional(field('inputs', $.param_list)),
      alias('->', $.direction),
      field('outputs', $.param_list),
      optional(field('body', $.struct_routine_body))
    ),

    // -----------------------------------------------------------------------
    // Block for state bodies — statements ARE wrapped in `stmt`
    // -----------------------------------------------------------------------
    block: $ => seq(
      '{',
      repeat($.stmt),
      '}'
    ),

    // -----------------------------------------------------------------------
    // Struct routine body — matches parser.y's routine_body_stmts.
    // Statements are NOT wrapped in `stmt`; they are direct children.
    // -----------------------------------------------------------------------
    struct_routine_body: $ => seq(
      '{',
      repeat($.struct_routine_stmt),
      '}'
    ),

    // Statements valid inside a struct routine body.
    // Matches parser.y's struct_routine_stmt alternatives.
    struct_routine_stmt: $ => choice(
      $.var_decl_stmt,
      $.assign_stmt,
      $._expr_stmt,
      $.if_stmt,
    ),

    // -----------------------------------------------------------------------
    // Top-level routine declaration
    // FIX: inputs is optional (same reason as struct_routine_decl)
    // -----------------------------------------------------------------------
    routine_decl: $ => seq(
      'routine',
      field('name', $.identifier),
      optional(field('inputs', $.param_list)),  // ← was required, now optional
      alias('->', $.direction),
      field('outputs', $.param_list),
      optional(field('body', $.block))
    ),

    // -----------------------------------------------------------------------
    // Autotuner declaration
    // -----------------------------------------------------------------------
    autotuner_decl: $ => seq(
      'autotuner',
      field('name', $.identifier),
      optional(field('inputs', $.param_list)),
      optional(seq(alias('->', $.direction), field('outputs', $.param_list))),
      '{',
      repeat(choice($.autotuner_var_decl, $.assign_stmt, $.requires_clause)),
      field('entry', $.entry_stmt),
      repeat($.state_decl),
      '}'
    ),

    autotuner_var_decl: $ => seq(
      field('type', $.type),
      field('name', $.identifier),
      optional(seq('=', field('init', $._expr))),
      ';'
    ),

    requires_clause: $ => seq(
      'uses',
      commaSep1($.qualified_type),
      ';'
    ),

    entry_stmt: $ => seq(
      'start',
      alias('->', $.direction),
      field('next', alias($.identifier, $.entry_target)),
      optional(seq('(', field('inputs', commaSep($.identifier)), ')')),
      ';'
    ),

    // -----------------------------------------------------------------------
    // State declaration
    // -----------------------------------------------------------------------
    state_decl: $ => seq(
      'state',
      field('name', $.identifier),
      optional(field('params', $.param_list)),
      '{',
      repeat($.stmt),
      '}'
    ),

    // -----------------------------------------------------------------------
    // Statements (inside states and autotuner bodies) — wrapped in `stmt`
    // -----------------------------------------------------------------------
    stmt: $ => choice(
      $.assign_stmt,
      $.var_decl_stmt,
      $.transition_stmt,
      $.terminal_stmt,
      $.if_stmt,
      $._expr_stmt,
    ),

    var_decl_stmt: $ => seq(
      field('type', $.type),
      field('variable_name', alias($.identifier, $.variable)),
      optional(seq('=', field('init', $._expr))),
      ';'
    ),

    assignment_target: $ => choice(
      alias($.identifier, $.variable),
      $.member_expr,
    ),

    assign_stmt: $ => seq(
      field('targets', commaSep1($.assignment_target)),
      '=',
      field('value', $._expr),
      ';'
    ),

    transition_stmt: $ => seq(
      alias('->', $.direction),
      field('target', $.identifier),
      optional(seq('(', commaSep($._expr), ')')),
      ';'
    ),

    terminal_stmt: $ => seq(
      'terminal',
      ';'
    ),

    // -----------------------------------------------------------------------
    // If/elif/else
    // -----------------------------------------------------------------------
    if_stmt: $ => seq(
      'if',
      '(',
      field('condition', $._expr),
      ')',
      '{',
      repeat($.stmt),
      '}',
      repeat($.elif_clause),
      optional($.else_clause)
    ),

    elif_clause: $ => seq(
      'elif',
      '(',
      field('condition', $._expr),
      ')',
      '{',
      repeat($.stmt),
      '}'
    ),

    else_clause: $ => seq(
      'else',
      '{',
      repeat($.stmt),
      '}'
    ),

    _expr_stmt: $ => seq(
      $._expr,
      ';'
    ),

    // -----------------------------------------------------------------------
    // Expressions
    // -----------------------------------------------------------------------

    operator: $ => token(choice(
      '+', '-', '*', '/', '==', '!=',
      '<', '>', '<=', '>=', '&&', '||'
    )),

    binary_expr: $ => prec.left(seq(
      field('left', $._expr),
      field('operator', choice(
        alias('+', $.operator),
        alias('-', $.operator),
        alias('!', $.operator),
        alias('*', $.operator),
        alias('/', $.operator),
        alias('==', $.operator),
        alias('!=', $.operator),
        alias('<', $.operator),
        alias('>', $.operator),
        alias('<=', $.operator),
        alias('>=', $.operator),
        alias('&&', $.operator),
        alias('||', $.operator)
      )),
      field('right', $._expr),
    )),

    _primary_expr: $ => choice(
      $.int_literal,
      $.float_literal,
      $.bool_literal,
      $.string_literal,
      $.nil_literal,
      'this',
      $.qualified_name,
      seq('(', $._expr, ')')
    ),

    named_arg: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expr)
    ),

    call_expr: $ => prec.left(seq(
      field('func', $._postfix_expr),
      '(',
      commaSep(choice($.named_arg, $._expr)),
      ')'
    )),

    member_expr: $ => prec.left(seq(
      field('object', $._postfix_expr),
      token.immediate('.'),
      field('member', $.identifier)
    )),

    index_expr: $ => prec.left(seq(
      field('object', $._postfix_expr),
      '[',
      field('index', $._expr),
      ']'
    )),

    _postfix_expr: $ => choice(
      $._primary_expr,
      $.member_expr,
      $.call_expr,
      $.index_expr,
    ),

    _expr: $ => choice(
      $.binary_expr,
      $._postfix_expr,
    ),

    // -----------------------------------------------------------------------
    // Qualified names — Module::symbol OR plain symbol
    // -----------------------------------------------------------------------
    qualified_name: $ => seq(
      optional(seq(
        field('module', $.qualified_name),
        alias('::', $.module_sep),
      )),
      field('symbol', $.identifier)
    ),
    qualified_type: $ => seq(
      optional(seq(
        field('module', $.qualified_type),
        alias('::', $.module_sep),
      )),
      field('symbol', $.identifier)
    ),

    // -----------------------------------------------------------------------
    // Parameter declarations
    // -----------------------------------------------------------------------
    param_list: $ => seq(
      '(',
      commaSep($.param_decl),
      ')'
    ),

    param_decl: $ => seq(
      field('type', $.type),
      field('param_name', $.identifier)
    ),

    type: $ => seq(
      $.qualified_type,
      optional(seq(
        alias('<', $.type_args_open),
        commaSep($.type),
        alias('>', $.type_args_close)
      ))
    ),

    // -----------------------------------------------------------------------
    // Literals
    // -----------------------------------------------------------------------
    int_literal: $ => /\d+/,
    float_literal: $ =>
      /([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?/,
    bool_literal: $ => choice('true', 'false'),
    string_literal: $ => seq('"', /[^"]*/, '"'),
    nil_literal: $ => 'nil',

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
  }
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
function commaSep(rule) {
  return optional(commaSep1(rule));
}
